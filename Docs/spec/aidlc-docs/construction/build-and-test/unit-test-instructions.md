# Unit Test Execution

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
# Backend（ReservationServiceTest 等）
cd backend && ./gradlew test

# Frontend（Vitest）
cd frontend && pnpm test
```

### 2. Review Test Results

- **Backend**: 208 tests, 0 failures, 0 errors（`backend/build/test-results/test/*.xml`）
- **Frontend**: 150 tests passed（20 test files）（`vitest run` 標準出力）
- **Test Report Location**: `backend/build/reports/tests/test/index.html`、フロントエンドは標準出力のみ（HTML レポートは未設定）

### 3. Fix Failing Tests

失敗した場合:

1. バックエンドは `backend/build/reports/tests/test/index.html` でスタックトレースを確認する
2. フロントエンドは `vitest run` の標準出力でテスト名と `expect` 失敗箇所を確認する
3. 本ユニット（reservation-draft）関連の失敗であれば `Docs/spec/aidlc-docs/construction/reservation-draft/functional-design/business-rules.md`（BR-01〜10）の期待仕様と実装の差分を確認する
4. 修正後に該当コマンドを再実行し、全件成功を確認する
