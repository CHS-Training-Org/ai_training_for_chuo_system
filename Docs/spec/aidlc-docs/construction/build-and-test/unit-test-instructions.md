# Unit Test Execution（usage-report）

## Run Unit Tests

### 1. Execute All Unit Tests（直列・省メモリ）

```bash
cd backend && ./gradlew test --max-workers=1
cd frontend && pnpm test
```

`vitest.config.ts` は `maxForks: 1` に固定されているため、frontend は並列にならない。複数のビルド・テストを同時に起動しない。

### 2. Run Only This Unit's Tests

```bash
cd backend && ./gradlew test --tests '*UsageCalculatorTest' --tests '*StatisticsServiceTest' --tests '*StatisticsControllerTest' --max-workers=1
cd frontend && pnpm test datetime statistics usage admin-reports admin-layout nav-items
```

### 3. Review Test Results

- **Expected**: backend 304 件・frontend 233 件がすべて成功、失敗 0
- **本ユニットの新規テスト**:
  - backend：`UsageCalculatorTest` 11 件、`StatisticsServiceTest` 13 件、`StatisticsControllerTest` 19 件（計 43 件）
  - frontend：`datetime.test.ts` 3 件、`server/actions/statistics.test.ts` 7 件、`usage-format.test.ts` 11 件、`usage-bar-chart.test.tsx` 5 件、`usage-filter-form.test.tsx` 9 件、`admin-reports-page.test.tsx` 12 件、`admin-layout.test.tsx` 4 件、`layout/nav-items.test.ts` に追加 2 件（計 53 件）
- **Test Coverage**: 未計測（カバレッジ計測ツールは本リポジトリの既定で未導入）
- **Test Report Location**: backend は `backend/build/reports/tests/test/index.html` と `backend/build/test-results/test/*.xml`、frontend は標準出力

### 4. Fix Failing Tests

失敗したら次の順で確認する。

1. `StatisticsControllerTest` が落ちる場合、H2 を他の結合テストと共有するため、他クラスのテストデータの残りがないかを確認する（本ユニットのテストは 2030 年の予約と接頭辞 `利用実績テスト` のリソースで seed し、自分のリソースだけを取り出して検証している。UUID の先頭は `73`）
2. `admin-reports-page.test.tsx` は Server Action をモックして Server Component を直接 `await` する。Client Component（`UsageFilterForm`）の `next/navigation` のモックが必要
3. 実装を修正し、全件が通るまで再実行する
