# Unit Test Execution（csv-report）

## Run Unit Tests

### 1. Execute All Unit Tests（直列・省メモリ）

```bash
cd backend && ./gradlew test --max-workers=1
cd frontend && pnpm test
```

`vitest.config.ts` は `maxForks: 1` に固定されているため、frontend は並列にならない。複数のビルド・テストを同時に起動しない。

### 2. Run Only This Unit's Tests

```bash
cd backend && ./gradlew test --tests '*CsvWriterTest' --tests '*ReservationReportServiceTest' --tests '*ReportControllerTest' --max-workers=1
cd frontend && pnpm test csv-download-button reports-csv-route reservations-page
```

### 3. Review Test Results

- **Expected**: backend 261 件・frontend 180 件がすべて成功、失敗 0
- **本ユニットの新規テスト**:
  - backend：`CsvWriterTest` 23 件、`ReservationReportServiceTest` 11 件、`ReportControllerTest` 19 件（計 53 件）
  - frontend：`csv-download-button.test.tsx` 5 件、`reports-csv-route.test.ts` 11 件、`reservations-page.test.tsx` に追加 6 件（計 22 件）
- **Test Coverage**: 未計測（カバレッジ計測ツールは本リポジトリの既定で未導入）
- **Test Report Location**: backend は `backend/build/reports/tests/test/index.html` と `backend/build/test-results/test/*.xml`、frontend は標準出力

### 4. Fix Failing Tests

失敗したら次の順で確認する。

1. `ReportControllerTest` が落ちる場合、H2 を他の結合テストと共有するため、他クラスのテストデータの残りがないかを確認する（本ユニットのテストは 2030 年の予約と固有のリソース名で seed し、行を ID・目的・リソース名で特定している）
2. `reports-csv-route.test.ts` は node 環境で動く（ファイル先頭の `// @vitest-environment node`）。jsdom に変えるとバイナリ本文の検証が崩れる
3. 実装を修正し、全件が通るまで再実行する
