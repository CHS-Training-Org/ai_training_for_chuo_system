# Performance Test Instructions — csv-export

NFR Requirements の決定（Q1=A）により、性能は**合否基準を持たない目安**として記録する（負荷テストは行わない）。ここでの目的は、(1) 大量件数でもメモリが増え続けないこと（V-03）、(2) `spring.mvc.async.request-timeout` の挙動（V-04）を実測して設定値の根拠を残すことである。

## 計測方法

```bash
# テストデータ（ローカル DB。計測後に必ず削除する）
docker exec -i <postgres コンテナ> psql -U bookflow -d bookflow <<'SQL'
INSERT INTO reservations (id, resource_id, requester_id, start_at, end_at, purpose, status)
SELECT ('99999998-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid,
       '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
       timestamp '2098-01-01' + (g || ' minutes')::interval,
       timestamp '2098-01-01' + (g || ' minutes')::interval + interval '30 minutes',
       'bulk test ' || g || ' ' || repeat('あ', 40),
       (ARRAY['DRAFT','PENDING','APPROVED','REJECTED','CANCELLED'])[1 + g % 5]
FROM generate_series(1, 20000) g;
SQL
curl -s -o out.csv -w "%{http_code} %{size_download}B %{time_total}s\n" -H "Authorization: Bearer $ADMIN" \
  -G http://localhost:8080/api/reports/reservations/csv --data-urlencode "from=2098-01-01T00:00:00" --data-urlencode "to=2099-01-01T00:00:00"
# 後始末
# DELETE FROM reservations WHERE id::text LIKE '9999999%';
```

メモリは `/proc/<BE の java の PID>/status` の `VmRSS` / `VmHWM` で見る（この環境には `ps` がない）。

## V-03: 件数と所要時間・メモリ（実 PostgreSQL・BE 1 台・ローカル）

| 件数 | 応答サイズ | 所要時間 | 結果 |
|---|---|---|---|
| 20,000 件（6 回連続） | 約 5.0 MB | 約 3.0〜4.5 秒 | 完走。行の重複なし、`start_at` 昇順。BE の RSS は 408〜419 MB で推移し、増え続けない（HWM 419 MB のまま） |
| 300,000 件（1 回） | 約 74 MB | 約 300 秒 | 完走（300,000 行・重複なし）。**所要時間が `request-timeout`（300 秒）にほぼ一致した**。ダウンロード後の RSS は 387 MB（HWM 419 MB で変化なし） |

**メモリ**: 件数が 15 倍になっても HWM は変わらず、ページ単位（500 件）の読み出しと逐次書き出しが機能している。

**所要時間は件数に対して線形ではない**: 20,000 件で約 3.5 秒（約 5,700 件/秒）に対し、300,000 件は約 300 秒（約 1,000 件/秒）。原因は、オフセット方式のページ読み出しで、`start_at` にインデックスがなく、深いページほど対象範囲全体の並べ替えが必要になることと考えられる（深さ 250,000 のページで `EXPLAIN ANALYZE` が約 450 ミリ秒）。設計の「既知の制約」にあるキーセット方式への変更、または `start_at` へのインデックス追加で改善できる。

**実用上の目安**: 現在の実装で `request-timeout` の 300 秒に収まるのは、おおよそ 30 万件まで。社内システムの規模では余裕があるが、データが増えた場合はこの上限が先に効く。

## V-04: `spring.mvc.async.request-timeout`

| 設定 | 条件 | 結果 |
|---|---|---|
| 未設定（コンテナの既定） | 300,000 件のダウンロード | **約 30.9 秒で途中切断**。受信は 33,500 行（全体の約 11%）。クライアント側には HTTP 200 のまま。WARN `csv_export_aborted`（`rowCount=33500`、`failureType=AsyncRequestNotUsableException`）が出る |
| `3s`（検証用の上書き） | 20,000 件（通常は約 3.5 秒かかる） | 約 3.8 秒で途中切断（15,500 行）。WARN が 1 行出る。`curl` の終了コードは 0（途中で切れたことがクライアントから分からない） |
| `300s`（本実装） | 20,000 件 | 完走（INFO `csv_export_completed`）。30 万件も完走（上記） |

**判断**: 既定の約 30 秒では数万件で途中切断が起こりうるため、**明示設定は必要**。5 分（`300s`）は、上の V-03 から約 30 万件までを許容する値で、社内システムの用途では妥当と判断し、暫定値のまま確定する。件数が増える場合は、先にページ読み出しの方式（キーセット方式・インデックス）を見直す。

**注意（残余リスク）**: タイムアウトや DB エラーで途中切断しても、HTTP 応答は正常終了（チャンクの終端あり）に見えるため、ダウンロードした CSV が欠けていることを利用者が検知できない。WARN ログで事後に追跡できるのみ。対策（末尾の件数行、`Content-Length` の事前計算など）は本ユニットの範囲外で、別課題とする。また、タイムアウト時に `GlobalExceptionHandler` が `Unexpected error` を ERROR（スタックトレース付き）で 1 件出す（応答は既に確定済みで影響はないが、ログのノイズになる）。
