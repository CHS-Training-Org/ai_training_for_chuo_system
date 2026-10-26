# Unit Test Execution

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
cd backend && ./gradlew test
cd frontend && pnpm test
```
本課題の追加分だけを実行する場合:
```bash
cd backend && ./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"
cd frontend && pnpm test resources
```

### 2. Review Test Results
- **Expected**: BE 148 件、FE 82 件がすべて pass（失敗 0）。
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
| BE Service | `ResourceServiceTest`（`ListWithKeyword`） | 12 | 正規化、`%` `_` `!` のエスケープ、ADMIN とカテゴリの分岐、期間との AND、`Sort` の受け渡し、ページネーション |
| BE Controller（H2） | `ResourceControllerTest` | 13 | 名称・説明の部分一致、大文字・小文字、空白、`%` `_` のリテラル扱い、カテゴリ・期間との AND、ADMIN と MEMBER の差、`sort` |
| FE Server Action | `tests/unit/server/actions/resources.test.ts` | 2 | `keyword` を渡す、未指定・空文字では渡さない |
