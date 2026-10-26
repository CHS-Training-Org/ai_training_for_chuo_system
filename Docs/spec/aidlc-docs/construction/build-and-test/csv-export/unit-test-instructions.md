# Unit Test Execution（csv-export）

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
cd backend && ./gradlew test
cd frontend && pnpm test
```
本課題の追加分だけを実行する場合:
```bash
cd backend && ./gradlew test --tests "*ReservationCsvWriterTest" --tests "*ReservationReportServiceTest" --tests "*ReportControllerTest"
cd frontend && pnpm test reports csv-route api-client nav-items
```
静的チェック:
```bash
cd backend && ./gradlew spotlessCheck checkstyleMain
cd frontend && pnpm lint && pnpm format:check && pnpm exec tsc --noEmit
```

### 2. Review Test Results
- **Expected**: BE 214 件、FE 130 件がすべて pass（失敗 0）。
- **Test Coverage**: カバレッジ計測は未設定のため数値はない。
- **Test Report Location**: BE は `backend/build/test-results/test/`（XML）と `backend/build/reports/tests/test/`（HTML）。FE は標準出力。

### 3. Fix Failing Tests
失敗した場合:
1. 上記のレポートで失敗したケースを特定する。
2. 実装を修正する（テストを緩めて通さない）。
3. 全件が pass するまで再実行する。

## 本課題で追加したテスト

| 対象 | ファイル | 件数 | 主な観点 |
|---|---|---|---|
| BE CSV 生成（ユニット。受入条件のユニットテスト） | `presentation/csv/ReservationCsvWriterTest` | 36 | BOM、ヘッダと列順、日時書式、承認状態のラベル 5 種、RFC 4180 のエスケープ、CSV インジェクション対策（`=` `+` `-` `@`、タブ、CR と、対象外の文字）、0 件、`null`、CRLF、UTF-8、出力ストリームを閉じないこと |
| BE Service（Mockito） | `application/ReservationReportServiceTest` | 8 | `from` > `to` の検証、同じ日付、片方だけの指定、並び順の指定、行への詰め替え |
| BE Controller（H2 の結合） | `presentation/ReportControllerTest` | 22 | 200 とヘッダと BOM、期間の境界（`from` の 0 時、`to` の日、翌日 0 時）、ステータス（複数、単一、AND）、並び順（同時刻は ID 順）、0 件、インジェクション対策の本文への反映、400 の 4 パターン、403（MEMBER、APPROVER）、401 |
| FE api-client | `tests/unit/lib/api-client.test.ts` | 4 | `getRaw` が Response をそのまま返す、トークンとクエリ、非 2xx で `ApiClientError` |
| FE Route Handler | `tests/unit/app/api/reports/csv-route.test.ts` | 12 | 本文（BOM を含むバイト列）とヘッダの中継、パラメータの選別、トークンの付与、未認証と 401、403 と 400 と 500 と通信失敗のリダイレクト |
| FE フォーム | `tests/unit/app/admin/reports/ReservationCsvExportForm.test.tsx` | 12 | 送信先、入力項目、ステータス 4 種（ドラフトは出ない）、開始日 > 終了日で送信が止まる、送信データ |
| FE ページ | `tests/unit/app/admin/reports/page.test.tsx` | 8 | `error` の値ごとのメッセージ、未知の値と `constructor` は汎用メッセージ |
| FE nav-items | `tests/unit/layout/nav-items.test.ts`（更新） | 2 件追加 | ADMIN にだけ「帳票出力」が出る |

## 変異確認（実施済み。再現したいとき）

該当箇所を一時的に壊してテストが失敗することを確かめ、元に戻す。

| 変異 | 失敗するはずのテスト |
|---|---|
| `ReservationReportService` の `to.plusDays(1)` を `to` に | `ReportControllerTest` の期間系 |
| `ReservationReportService` の並び順の `id` を降順に | `ReportControllerTest` と `ReservationReportServiceTest` の並び順 |
| `ReservationCsvWriter` の `FORMULA_PREFIXES` から `@` を除く | `ReservationCsvWriterTest` の `formulaPrefix` |
| `route.ts` の `getAll("status")` を `get` に | `csv-route.test.ts` のパラメータ系 |
| `ReservationCsvExportForm` の `from > to` を `from < to` に | `ReservationCsvExportForm.test.tsx` の前後チェック |
| `nav-items.ts` の「帳票出力」を削除 | `nav-items.test.ts` |
