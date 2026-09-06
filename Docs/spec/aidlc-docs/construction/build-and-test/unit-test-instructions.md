# Unit / Integration Test Execution — resource-list-filter

> `ResourceControllerTest` は H2 実DBを使った結合テストだが、既存の運用に合わせてバックエンドの `./gradlew test` に含めて実行する（独立した integration-test タスクは本リポジトリに存在しない）。

## Run Tests

### バックエンド（ユニット + 結合）
```bash
cd backend
./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"
```
- **Expected**: 全テスト pass、0 failures
- **Test Report Location**: `backend/build/reports/tests/test/index.html`

### バックエンド（全体回帰）
```bash
cd backend
./gradlew test
```
- **Expected**: 既存テストを含め全 pass（今回の変更による regression がないことを確認）

### フロントエンド
```bash
cd frontend
pnpm test resources   # 変更箇所のみ
pnpm test             # 全体回帰
```
- **Expected**: 全 pass

## 実行結果（2026-09-06 時点）

| コマンド | 結果 |
|---|---|
| `./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"` | BUILD SUCCESSFUL |
| `./gradlew test`（全体） | BUILD SUCCESSFUL |
| `./gradlew build`（spotlessApply + checkstyle + test 含む） | BUILD SUCCESSFUL（Checkstyle は既存パターンの警告のみ、失敗なし） |
| `pnpm test resources` | 12 tests passed |
| `pnpm test`（全体） | 81 tests passed |
| `pnpm lint` | クリーン |
| `pnpm format:check` | クリーン |
| `pnpm build`（プロダクションビルド・型チェック含む） | Compiled successfully |

## Fix Failing Tests（参考）
今回は全テスト pass のため該当なし。将来 regression が出た場合は `backend/build/reports/tests/test/index.html`（バックエンド）または `vitest` の失敗出力（フロントエンド）を確認し、`ResourceRepository#searchByFilters` の JPQL・`ResourceService` の keyword 分岐・`ResourceFilterForm` の入力欄を疑う。
