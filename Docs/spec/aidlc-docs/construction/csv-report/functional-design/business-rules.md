# Business Rules — csv-report

## ルール一覧

| # | ルール | 根拠 |
|---|---|---|
| BR-01 | `GET /api/reports/reservations/csv` は ADMIN のみ。Controller のメソッドに `@PreAuthorize("hasRole('ADMIN')")` を付ける。MEMBER・APPROVER は 403、未認証は 401 | RPT-04、`UserController`・`ResourceController` の既存方式 |
| BR-02 | `from` と `to` は両方指定か両方なしのみ有効。片方だけは 400（`VALIDATION_ERROR`、文言「from と to は同時に指定してください。」） | 要件の決定事項 2、既存の予約一覧と同じ |
| BR-03 | 期間は期間重複判定。条件は `r.startAt < :to AND r.endAt > :from`（既存の `PERIOD_MATCH` を再利用）。境界一致の隣接は含まない。両方なしは期間条件なし | 要件の決定事項 1・2 |
| BR-04 | `status` 未指定は `PENDING`・`APPROVED`・`REJECTED`・`CANCELLED` のみ（DRAFT を含めない）。指定時はその値だけ（複数可）。`status=DRAFT` を明示したときは、ADMIN は他人の DRAFT も含めて出力する（ADMIN は DRAFT を含む全予約を閲覧できるため）。不正な値は 400 | 要件の決定事項 3、RSV-02 |
| BR-05 | 並びは `startAt` の昇順、同値は `id` の昇順 | 既定の前提 |
| BR-06 | 列は左から「予約ID」「リソース名」「申請者名」「開始日時」「終了日時」「目的」「承認状態」の 7 列。1 行目はこの日本語ヘッダ行 | RPT-02 |
| BR-07 | 値の整形：予約 ID は UUID 文字列、リソース名は `resource.name`、申請者名は `requester.name`、日時は `yyyy-MM-dd HH:mm`（秒は出さない、タイムゾーン変換なし）、目的は `purpose` のまま、承認状態は日本語ラベル（`PENDING`=承認待ち、`APPROVED`=承認済み、`REJECTED`=却下、`CANCELLED`=キャンセル済み、`DRAFT`=下書き）。ラベルは `switch` 式で全値を網羅し、enum に値が増えたらコンパイルエラーにする | RPT-02、`frontend/src/lib/labels.ts` と同じ表記 |
| BR-08 | RFC 4180 エスケープ：セルに `,`・`"`・CR・LF のいずれかが含まれる場合、全体を `"` で囲み、内部の `"` は `""` にする | US-05 |
| BR-09 | CSV 数式インジェクション対策：セルの先頭が `=`・`+`・`-`・`@`・タブ・CR のいずれかなら、先頭に `'` を付ける。BR-08 より先に適用する（付与後に引用符が必要なら囲む）。ヘッダ行は固定文字列なので対象外。`'` は取り込み先（Excel 等）でそのまま表示される。数式として実行されない安全性を優先する | US-05 |
| BR-10 | 文字コードは UTF-8、本文の先頭に BOM（`EF BB BF`）、改行は CRLF、最終行にも CRLF を付ける | 受入条件、既定の前提 |
| BR-11 | 応答ヘッダは `Content-Type: text/csv;charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_yyyyMMdd.csv"`（サーバー側の `LocalDate.now()`）、`Cache-Control: no-store`（個人情報を含むためキャッシュさせない） | RPT-01、既定の前提 |
| BR-12 | 条件に合う予約が 0 件のときは、ヘッダ行のみの CSV を 200 で返す | 既定の前提 |
| BR-13 | Route Handler は `status`・`from`・`to` の 3 項目だけをバックエンドへ転送する。`from`/`to` は 16 文字なら `:00` を補う。バックエンドの非 2xx 応答（401・403・400 等）は、ステータス・本文・`Content-Type` をそのまま返す。CSV 本文は文字列に変換せずバイト列で中継する | 要件の決定事項 9、BOM を壊さないため |
| BR-14 | ボタンは `profile.role === "ADMIN"` のときだけ描画する。リンクには現在の `status`・`from`・`to` を引き継ぎ、`resourceName`・`page` は引き継がない。`status` が未選択のときはクエリに含めない（バックエンドの既定が画面の「すべて」と同じ DRAFT 以外になる） | RPT-05、要件のスコープ外項目 |
| BR-15 | 取得は `@Transactional(readOnly = true)` 内で行い、クエリは `JOIN FETCH r.resource JOIN FETCH r.requester` を付ける（`open-in-view: false` と LAZY のため） | RE の調査結果 |

## ストーリーとテストの対応

| ルール | ストーリー | テスト（種別） |
|---|---|---|
| BR-01 | US-04 | `ReportControllerTest`：ADMIN の 200、MEMBER・APPROVER の 403、未認証の 401 |
| BR-02 | US-03 | `ReportControllerTest`：`from` のみ、`to` のみで 400 |
| BR-03 | US-03 | `ReportControllerTest`：重複する予約のみ出力、境界隣接を除外 |
| BR-04 | US-03 | `ReportControllerTest`：既定で DRAFT 除外、`status=DRAFT` で DRAFT のみ、不正値で 400。`ReservationReportServiceTest`：status 未指定時に渡す集合が DRAFT 以外の 4 値 |
| BR-05 | US-02 | `ReportControllerTest`：開始日時の昇順 |
| BR-06・BR-07 | US-02 | `ReservationReportServiceTest`：行の整形（日時・ラベル 5 値）、`CsvWriterTest`：ヘッダ行 |
| BR-08 | US-05 | `CsvWriterTest`：カンマ・二重引用符・CR・LF、列数が崩れないこと |
| BR-09 | US-05 | `CsvWriterTest`：`=` `+` `-` `@` タブ CR の各先頭、通常文字列は不変、無害化後に引用符が必要な場合 |
| BR-10 | US-02 | `CsvWriterTest`：先頭 3 バイトが BOM、CRLF、最終行の CRLF |
| BR-11 | US-01 | `ReportControllerTest`：`Content-Type`・`Content-Disposition` の形式（`reservations_\d{8}\.csv`）、`Cache-Control` |
| BR-12 | US-02 | `ReservationReportServiceTest`：0 件でヘッダのみ |
| BR-13 | US-04 | Route Handler のユニットテスト：トークンなしで 401、パラメータの転送と秒補完、非 2xx の透過、バイト列（BOM）の保持 |
| BR-14 | US-01・US-04 | `reservations-page.test.tsx`：ADMIN でボタン表示、MEMBER で非表示。`CsvDownloadButton` のテスト：`href` の組み立て（`resourceName`・`page` を含まない） |
| BR-15 | US-02 | `ReportControllerTest`（H2）で LAZY エラーなく申請者名・リソース名が出ること |
