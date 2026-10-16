# Services — CSV 帳票出力

## 1. サービス定義

| サービス | 層 | 役割 | 依存先 |
|---|---|---|---|
| `ReservationReportService` | application | 検証 → 条件の正規化 → ページ読み出しループ → Writer への受け渡しのオーケストレーション | `ReservationRepository`、`ReservationCsvWriter`（都度生成）、`ValidationException` |

`ReservationCsvWriter` は Service ではなく、出力形式を担う純粋なクラスである（Q1=A）。新しい Service はこの 1 つだけ。

## 2. オーケストレーション

呼び出しスレッドと、`StreamingResponseBody` が動く別スレッドの境界を意識して分担する。

| 順 | スレッド | 担当 | 内容 |
|---|---|---|---|
| 1 | リクエスト | Spring Security | JWT 検証、`@PreAuthorize("hasRole('ADMIN')")`（401 / 403） |
| 2 | リクエスト | Spring MVC | `status` / `from` / `to` の型変換（失敗は 400） |
| 3 | リクエスト | `ReportController` → `ReservationReportService#validate` | `from` >= `to` を検出（400）。**ここまでで失敗はすべて通常の JSON エラーになる**（NFR-02） |
| 4 | リクエスト | `ReportController` | ヘッダを組み立て、`StreamingResponseBody` を返す |
| 5 | ストリーミング | `ReservationReportService#writeReservationsCsv` | Writer 生成 → BOM → ヘッダ → 500 件ずつ「読む → 書く → flush」を `hasNext()` が false になるまで繰り返す |

```text
page = 0
do {
  slice = repository.findForReport(statuses, from, to, PageRequest.of(page, 500))   // 1 ページごとに短い読み取り専用トランザクション
  writer.writeRows(slice.getContent())
  writer.flush()
  page++
} while (slice.hasNext())
```

## 3. トランザクション境界（Q2=A）

- **1 ページ = 1 トランザクション**。`ReservationRepository#findForReport` に `@Transactional(readOnly = true)` を付け、トランザクションはクエリの実行から結果の取り出しまでで終わる。ダウンロードが遅くても DB 接続を保持し続けない（Q2 の C 案を避ける）。
- `ReservationReportService` には `@Transactional` を付けない。理由は 2 つある。(a) ストリーミング全体を 1 つのトランザクションで包むと、遅いクライアントが接続を占有する。(b) 同一クラス内のメソッド呼び出しには Spring のプロキシが効かないため、Service 内の補助メソッドに `@Transactional` を付けても無効になる。Repository のメソッドに付ければプロキシ経由になる。
- `spring.jpa.open-in-view: false`（`application.yml`）のため、ストリーミングスレッドで永続コンテキストがページをまたいで蓄積しない。ページごとにエンティティは解放され、メモリは 1 ページ分（500 件）で一定になる（FR-11）。
- `resource` / `requester` は `JOIN FETCH` で読むため、トランザクション終了後の Writer による参照でも遅延読み込みは発生しない（NFR-04）。

### 既知の制約（設計成果物としての注意点）

1. **オフセット方式の弱点**: 出力中に予約が追加・変更されると、まれに行の重複・欠落が起きうる。社内システムの規模では許容する。データ規模・厳密性の要求が上がった場合の改善案はキーセット方式（Q2 の B 案）。
2. **書き出し開始後の失敗**: 200 とヘッダ送信後に DB エラー等が起きても HTTP ステータスは変更できず、CSV が途中で切れる。FE のリダイレクト（Q4=B）で扱えるのは、書き出し開始前に確定する 400 / 401 / 403 のみ。途中切断はサーバーログ（`LOG.error`、PII なし）で追う。

## 4. 例外処理（SECURITY-15）

| 事象 | 発生箇所 | 結果 |
|---|---|---|
| `from` / `to` / `status` の型変換失敗 | MVC | 400 `VALIDATION_ERROR`（既存 `handleMethodArgumentTypeMismatch`） |
| `from` >= `to` | `validate`（リクエストスレッド） | 400 `VALIDATION_ERROR`（既存 `handleValidation`） |
| ADMIN 以外 | `@PreAuthorize` | 403 `FORBIDDEN`（既存 `handleAccessDenied` / `RestAccessDeniedHandler`） |
| 未認証 | Security | 401 `UNAUTHORIZED`（既存 `RestAuthenticationEntryPoint`） |
| 書き出し中の `IOException`（切断） | ストリーミングスレッド | 伝播して処理を終了。トランザクションはページ単位のため DB 接続は残らない |
| 書き出し中の DB 例外 | ストリーミングスレッド | 伝播。CSV は途中で切れる（§3 制約 2）。エラー本文に内部情報は出さない |
