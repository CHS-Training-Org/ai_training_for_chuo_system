# Unit Test Execution — csv-export

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
cd backend && ./gradlew test
cd frontend && pnpm test
```

### 2. Review Test Results

- **Expected（backend）**: 既存を含む全 197 件が pass。本ユニットの新規は `ReservationCsvWriterTest` 26 件、`ReservationReportServiceTest` 16 件、`ReportControllerTest` 21 件（結合・H2）
- **Expected（frontend）**: 13 ファイル・113 件が pass。本ユニットの新規・変更は `datetime.test.ts`、`app/reports-csv-route.test.ts`、`app/admin-reports-page.test.tsx`、`layout/nav-items.test.ts`
- **Test Report Location**: `backend/build/test-results/test/`（JUnit XML）、`backend/build/reports/tests/test/index.html`

### 3. Fix Failing Tests

1. `backend/build/reports/tests/test/index.html` または Vitest の出力でスタックトレースを確認する
2. `ReservationCsvWriterTest` が落ちたら、`toCell` の**適用順序**（数式注入の無害化 → RFC 4180 の引用）を最初に疑う
3. `ReservationReportServiceTest` のログ検証が落ちたら、`ReservationReportService` のログ書式（`kv()` の項目名）を確認する
4. `reports-csv-route.test.ts` で BOM を比較するときは `Response.text()` を使わない（BOM が取り除かれる）。バイト列で比較する

## 実測結果（本タスクで実行済み）

| コマンド | 結果 |
|---|---|
| `cd backend && ./gradlew build` | BUILD SUCCESSFUL（全 197 件 pass、`spotlessCheck`・Checkstyle 成功） |
| `cd frontend && pnpm test` | 13 ファイル・113 件 pass |
| `cd frontend && pnpm lint` | エラーなし |
| `cd frontend && pnpm format:check` | 全 85 ファイルが適合 |
| `cd frontend && npx tsc --noEmit` | 型エラーなし |
| `cd frontend && pnpm build` | 成功（`/admin/reports`・`/api/reports/reservations/csv` を含む） |
| `cd docs-next && npm run build` | 成功（既存の drawio.svg 警告のみ） |
