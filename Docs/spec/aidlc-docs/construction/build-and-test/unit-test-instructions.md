# Unit Test Execution

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
cd backend && ./gradlew test
cd backend && ./gradlew test --tests "*ResourceServiceTest"   # 今回の対象のみ
cd frontend && pnpm test
cd frontend && pnpm test resources                            # 今回の対象のみ
```

### 2. Review Test Results
- **Expected**: backend 141 件、frontend 83 件がすべて pass
- **Test Coverage**: 計測値は未取得。変更した振る舞いは新規テストで確認している
- **Test Report Location**: `backend/build/reports/tests/test/index.html`、`backend/build/test-results/test/`

### 3. 今回追加したテスト
- `ResourceServiceTest.ListWithKeyword`（8 件）：前後空白の除去、カテゴリ未指定時の全カテゴリ、ADMIN と MEMBER の有効無効、空白のみ・null の既存経路、空き確認との併用
- `resources.test.ts`（3 件）：`keyword` の受け渡し、`category`・`from`・`to` との併用、未指定・空文字では付けない

### 4. Fix Failing Tests
1. `backend/build/test-results/test/` または vitest の出力で失敗したケースを特定する
2. コードを直して再実行する
