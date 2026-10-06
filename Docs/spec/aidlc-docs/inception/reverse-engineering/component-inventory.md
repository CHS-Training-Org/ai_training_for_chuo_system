# Component Inventory

## Application Packages

- `backend` - Spring Boot API（domain/application/presentation/infrastructure の4レイヤー）
- `frontend` - Next.js App Router（Server Components + Server Actions）
- `docs-next` - Docusaurus ドキュメントサイト（アプリケーションには含まれないが、Spec-first の真実の源）

## Infrastructure Packages

- なし（本リポジトリはチュートリアル用モノレポで、IaC パッケージは `.devcontainer/docker-compose.yml`（ローカル開発用）のみ）

## Shared Packages

- なし（`backend`/`frontend` は REST API 経由でのみ連携し、コード共有パッケージは持たない）

## Test Packages

- `backend/src/test/` - JUnit 5 + H2 + Mockito（Service層ユニットテスト・Controller層結合テスト）
- `frontend/tests/unit/` - Vitest + Testing Library + MSW
- `frontend/tests/e2e/` - Playwright

## Total Count

- **Total Packages**: 3（backend / frontend / docs-next）
- **Application**: 2（backend / frontend）
- **Infrastructure**: 0
- **Shared**: 0
- **Test**: 2（backend同梱 / frontend同梱）
