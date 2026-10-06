# Unit Test Execution — reservation-list-filter

> 本リポジトリは `backend`/`frontend` 共通の独立した Integration Test 層を持たない。backend の `ReservationControllerTest` は H2 実データに対する MockMvc 結合テストだが、既存の `./gradlew test` 単一コマンドで実行される（カテゴリ分割なし）ため、本ユニットテスト実行手順にまとめて記載する。

## Backend

### 1. 全テスト実行

```bash
cd backend
./gradlew test
```

### 2. reservation-list-filter ユニットのみ実行する場合

```bash
./gradlew test --tests "*ReservationServiceTest" --tests "*ReservationControllerTest"
```

### 3. テスト結果

- **期待値**: 全テスト成功、0 failure / 0 error
- **テストレポート**: `backend/build/test-results/test/*.xml`（JUnit XML）、`backend/build/reports/tests/test/index.html`（HTML）
- **実測値（本セッション）**: 全 176 テスト成功（`ReservationServiceTest$List_` 8 件・`ReservationControllerTest` 29 件を含む）

## Frontend

### 1. 全テスト実行

```bash
cd frontend
pnpm test
```

### 2. reservation-list-filter 関連のみ実行する場合

```bash
pnpm test reservations
```

### 3. テスト結果

- **期待値**: 全テスト成功
- **実測値（本セッション）**: 全 109 テスト成功（`reservations.test.ts` 17 件・`reservation-filter-form.test.tsx` 7 件を含む）

## Lint・フォーマット

```bash
# backend
cd backend && ./gradlew spotlessApply checkstyleMain

# frontend
cd frontend && pnpm lint && pnpm format:check
```

- **実測値（本セッション）**: いずれも差分・エラーなし（Checkstyle の既存 WARN は本ユニットと無関係）
