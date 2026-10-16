# NFR Design Patterns — csv-export

入力: `nfr-requirements/`（承認済み）、`application-design/`（承認済み）、`plans/csv-export-nfr-design-plan.md` の回答（Q1=A / Q2=A / Q3=A）。回答は全問単一選択で、曖昧・矛盾なし。

## 1. パターン一覧

| # | パターン | 対応 NFR | 適用先 |
|---|---|---|---|
| D-01 | 事前検証・fail closed（書き出し前に認可・検証を完了） | R-01 / S-01〜03 | `ReportController` / `ReservationReportService#validate` |
| D-02 | ページ単位の短いトランザクション + 逐次ストリーミング | P-02 / R-02 / R-03 | `ReservationReportService` / `ReservationRepository#findForReport` |
| D-03 | 出力値の無害化（数式注入 → RFC 4180 の順） | S-01 | `ReservationCsvWriter#toCell` |
| D-04 | 実行記録（完了時 INFO / 未完了時 WARN）。構造化フィールド | S-04 | `ReservationReportService`（`try / finally`） |
| D-05 | 非同期タイムアウトの明示設定 | P-04 | `application.yml` |
| D-06 | 応答ヘッダによる防御（`nosniff`、`no-store`） | S-05 / S-06 | FE Route Handler、`ReportController` |
| D-07 | 同時実行は既定のまま（制限なし）。制約として記録 | P-01 / A-01 | 設計上の制約 |

## 2. 各パターンの設計

### D-01 事前検証・fail closed（S-01〜03 / R-01）

- 順序は `services.md` §2 のとおり。401 / 403（Security）→ 型変換 400（MVC）→ `validate` 400 → `StreamingResponseBody` の返却。ここまでの失敗はすべて通常の JSON エラーで、本文の書き出しは始まっていない。
- 検証は `ReportController` がリクエストスレッドで同期的に呼ぶ。`StreamingResponseBody` のラムダの**中では検証しない**（中で失敗すると 200 送信後になり、ステータスを変えられない）。
- エラー本文は既存 `GlobalExceptionHandler` に任せ、内部情報・例外メッセージを出さない。新しい例外クラス・`ErrorCode` は作らない。

### D-02 ページ単位トランザクション + 逐次ストリーミング（P-02 / R-02 / R-03）

- 1 ページ 500 件（コード内の定数）。1 ページの読み出しごとに `ReservationRepository#findForReport` の `@Transactional(readOnly = true)` で短いトランザクションを開閉する。Service には `@Transactional` を付けない（同一クラス内呼び出しにプロキシが効かないため。`services.md` §3）。
- ページごとに「読む → 書く → flush」を繰り返し、全件をメモリに保持しない。`open-in-view: false` のため永続コンテキストはページをまたいで蓄積しない。
- 書き出し中の `IOException`（切断）はそのまま伝播して処理を終え、DB 接続は残らない。
- オフセット方式による稀な重複・欠落は許容する（R-03）。

### D-03 出力値の無害化（S-01）

- セル値は `toCell` を必ず通す。数式注入対策（`=` `+` `-` `@` 始まり、先頭の制御文字）を先に適用し、その後に RFC 4180 のエスケープ（`"` の二重化、`,` / 改行 / `"` を含む場合の引用符）を適用する。順序を逆にすると無害化記号が引用符の内側で失われうる。
- `toCell` は `static` の純粋関数で、DB・Spring に依存しない（M-02）。ステータスのラベルも同じ Writer の `switch` 式で、5 値（`DRAFT` 含む）を網羅する（M-04）。

### D-04 実行記録（S-04 / Q1=A / Q3=A）

**位置**: `ReservationReportService#writeReservationsCsv` の読み出しループを `try / finally` で囲む。実行ユーザー ID はリクエストスレッドで `@CurrentUser User` から取り出し、`UUID` の値として引数で渡す。ストリーミングスレッドでは `SecurityContext` を使わない。

```text
start = 現在時刻（単調時計）
count = 0
completed = false
try {
  ... 読み出しループ（ページごとに count += ページの件数）
  completed = true
} finally {
  elapsedMs = 経過時間
  completed ? INFO "csv export completed" : WARN "csv export aborted"
}
```

- **完了時（INFO）**: 項目は下記「ログ項目」のとおり。
- **未完了時（WARN）**: 同じ項目に加えて、失敗の種別（`failureType`: 例外クラスの単純名のみ）を出す。**例外メッセージ・スタックトレースは、この 1 行には含めない**（メッセージに値が混ざる可能性を避ける）。例外自体は従来どおり伝播させ、既存の例外ログの扱いに任せる。
- 書き出し前の失敗（400 / 401 / 403）は、ストリーミングに入らないため、この 2 行の対象外。リクエストログ（ADR-017）に残る。

**ログ項目（`StructuredArguments.kv()` で JSON フィールドとして出力。追加依存なし）**

| フィールド | 内容 | 備考 |
|---|---|---|
| `event` | `csv_export_completed` / `csv_export_aborted` | 検索キー |
| `userId` | 実行ユーザーの UUID | 氏名・メールは出さない |
| `statuses` | 正規化後の `status` の一覧 | 未指定は全 5 値 |
| `from` / `to` | 期間の指定（未指定は null） | ISO 8601 |
| `rowCount` | 書き出した行数 | 未完了時は「そこまでの件数」 |
| `elapsedMs` | 所要時間（ミリ秒） | |
| `failureType` | 例外クラスの単純名 | 未完了時のみ |

`traceId` / `spanId` は既存の MDC 出力で付く。CSV の中身（申請者名・利用目的など）は一切出さない（SECURITY-03）。

### D-05 非同期タイムアウト（P-04）

- `application.yml` の `spring.mvc.async.request-timeout` に `300s`（5 分）を明示する。この値は、ストリーミング全体の所要時間の上限として働く。
- 上限に達した場合は、書き出し中の応答が途中で切れる（D-02 の制約と同じ形）。D-04 の `finally` が働き、WARN が 1 行残る。
- 5 分は暫定。Build and Test の V-04 で既定値の挙動と設定後の挙動を確認して調整する。

### D-06 応答ヘッダ（S-05 / S-06）

- BE（`ReportController`）: `Content-Type: text/csv; charset=UTF-8`、`Content-Disposition: attachment`、`Cache-Control: no-store`。
- FE（Route Handler）: 中継で作る新しい `Response` に、BE の `Content-Type` / `Content-Disposition` を引き継ぎ、`Cache-Control: no-store` と `X-Content-Type-Options: nosniff` を明示して付ける。
- アプリ全体の CSP / HSTS / `X-Frame-Options` は変更しない（既知のギャップとして別課題。`nfr-requirements.md` §3）。

### D-07 同時実行（Q2=A）

- 同時実行の制限は設けない。ストリーミングは Spring Boot 既定の実行基盤（`applicationTaskExecutor`）で動く。既定のコアスレッド数（8 と想定）を超えて長時間ダウンロードが同時に走ると、**ほかの非同期処理が待たされる可能性がある**。
- 現状、非同期処理は本機能のみで、実行できるのは ADMIN に限られる。想定される同時実行は少なく、追加の仕組みは過剰と判断する。
- 既定値の実機確認は Code Generation / Build and Test で行い、結果を記録する。必要になった場合は、専用の実行基盤または同時実行の上限（ステータス 429）を後から追加できる。

## 3. 既知の制約・残余リスク

1. 書き出し開始後の失敗では CSV が途中で切れる（`services.md` §3 制約 2）。D-04 の WARN で追跡できるが、利用者への通知はない。
2. 管理者アカウント侵害による一括持ち出しは、D-04 の実行記録で**検知の材料**にはなるが、防止はしない（件数上限は Out of Scope）。運用での検知を前提とする。
3. 同時実行の制限がないため、多数の同時ダウンロードでスレッドが占有されうる（D-07）。
4. `request-timeout` の 5 分は暫定値（D-05）。
5. SECURITY-04 の全画面ヘッダは未対応（D-06）。

## 4. NFR との対応検証

| NFR | 設計 |
|---|---|
| P-01 / P-03 | 数値は目安。専用の設計要素なし（D-07 の制約として記録） |
| P-02 | D-02 |
| P-04 | D-05 |
| A-01 | 新規インフラなし（`logical-components.md` §3） |
| R-01〜R-03 | D-01 / D-02 / D-04 |
| S-01 | D-01 / D-03 |
| S-02 / S-03 | D-01（認可・fail closed）。既存ハンドラを再利用 |
| S-04 | D-04 |
| S-05 | D-06 |
| S-06 | D-04 / D-06（軽減策）。レート制限は N/A |
| M-01〜M-05 / U-01〜U-03 / V-01〜V-05 | 本ステージの設計対象外。Code Generation / Build and Test で扱う |
