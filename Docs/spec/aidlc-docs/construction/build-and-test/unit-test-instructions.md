# Unit Test Execution — resource-detail-info

> 本リポジトリは `backend`/`frontend` 共通の独立した Integration Test 層を持たない。backend の `*ControllerTest` は H2 実データに対する MockMvc 結合テストだが、既存の `./gradlew test` 単一コマンドで実行される（カテゴリ分割なし）ため、本ユニットテスト実行手順にまとめて記載する。

## Backend

### 1. 全テスト実行

```bash
cd backend
./gradlew test
```

### 2. resource-detail-info ユニットのみ実行する場合

```bash
./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"
```

### 3. テスト結果

- **期待値**: 全テスト成功、0 failure / 0 error
- **テストレポート**: `backend/build/test-results/test/*.xml`（JUnit XML）、`backend/build/reports/tests/test/index.html`（HTML）
- **実測値（本セッション）**: 全 188 テスト成功（resource-search・resource-sort・reservation-list-filter ユニットまでの既存分 + resource-detail-info ユニットの新規・拡張分 `ResourceControllerTest` を含む）

## Frontend

### 1. 全テスト実行

```bash
cd frontend
pnpm test
```

### 2. resource-detail-info 関連のみ実行する場合

```bash
pnpm test resources
```

### 3. テスト結果

- **期待値**: 全テスト成功
- **実測値（本セッション）**: 全 112 テスト成功（`resources.test.ts` 19件を含む）

## Lint・フォーマット

```bash
# backend
cd backend && ./gradlew spotlessApply checkstyleMain

# frontend
cd frontend && pnpm lint && pnpm format:check
```

- **実測値（本セッション）**: いずれも差分なし。Checkstyle は警告4件検出（2件は既存の `ReservationRepository` メソッド名、2件は resource-detail-info ユニットで新規の `Resource.create`/`update` `ParameterNumber` 超過）。いずれも severity=warning のためビルド非失敗
