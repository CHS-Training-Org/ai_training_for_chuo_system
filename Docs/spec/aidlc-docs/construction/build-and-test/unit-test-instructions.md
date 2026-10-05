# Unit Test Execution — resource-list-filter

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
cd backend && ./gradlew test
cd frontend && pnpm test
```

### 2. Review Test Results

- **Expected（backend）**: `ResourceServiceTest` 27件・`ResourceControllerTest` 27件を含む全テストが pass（実測値。実行済み・下記参照）
- **Expected（frontend）**: 10ファイル・81テストが pass（実測値。実行済み・下記参照）
- **Test Report Location**: `backend/build/test-results/test/`（JUnit XML）、`backend/build/reports/tests/test/index.html`（HTML）

### 3. Fix Failing Tests

失敗時は以下の順で確認する：
1. `backend/build/reports/tests/test/index.html` でスタックトレースを確認
2. `ResourceRepository.search(...)` の JPQL が H2/PostgreSQL 両方で解釈可能な構文か確認（本タスクで実際に発生した問題。`integration-test-instructions.md` 参照）
3. 再実行

## 実測結果（本タスクで実行済み）

| コマンド | 結果 |
|---|---|
| `cd backend && ./gradlew test` | BUILD SUCCESSFUL（`ResourceServiceTest` 27/27 pass、`ResourceControllerTest` 27/27 pass） |
| `cd backend && ./gradlew spotlessCheck checkstyleMain` | BUILD SUCCESSFUL（エラーなし。既存の無関係な警告2件のみ） |
| `cd frontend && pnpm test` | 10ファイル・81テスト全pass |
| `cd frontend && pnpm lint` | エラーなし |
| `cd frontend && pnpm format:check` | 全79ファイルが適合 |
| `cd frontend && npx tsc --noEmit` | 型エラーなし |
