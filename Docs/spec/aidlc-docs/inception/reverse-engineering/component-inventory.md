# Component Inventory

## Application Packages

- `frontend` - Next.js 15 App Router によるユーザー向け画面 + BFF層（Server Actions）
- `backend` - Spring Boot 4.0 による REST API（4層構成: domain / application / presentation / infrastructure）

## Infrastructure Packages

- なし（CDK/Terraform 等の IaC は本リポジトリに含まれない。本番相当の構成は `docs-next/docs/reference/architecture.md` に文書として存在するのみ）

## Shared Packages

- なし（`frontend` と `backend` の間でコード共有パッケージ（型定義の自動生成等）は存在しない。今回のエンハンス課題シートで言及されている「OpenAPI クライアント自動生成」は別課題として未着手）

## Test Packages

- `frontend/tests/unit` - Vitest によるユニットテスト（Server Actions・純関数中心）
- `frontend/tests/e2e` - Playwright による E2E テスト（`example.spec.ts` 1件のみ、カバレッジは薄い）
- `backend/src/test/java` - JUnit5 によるテスト。`application/*ServiceTest.java`（`@Mock` によるモック単体テスト）と `presentation/*ControllerTest.java`（`@SpringBootTest` + H2 による統合テスト）の2系統

## Documentation Packages

- `docs-next` - Docusaurus によるドキュメントサイト（`docs/learn` / `docs/develop` / `docs/spec` / `docs/reference` / `docs/operations`）
- `Docs/spec` - AI-DLC エンジンの作業ファイル（`aidlc-state.md` / `aidlc-audit.md` / `aidlc-docs/`）

## Infrastructure-as-Local-Dev Packages

- `.devcontainer` - DevContainer + Docker Compose（frontend/postgres/localstack/cognito-local/docs の5サービス）
- `scripts` - `provision-cognito.sh`（cognito-local へのユーザープール・シードユーザー投入）、`clean-devcontainer-mounts.sh`、`seed.sql`

## Total Count

- **Total Packages**: 5（frontend, backend, docs-next, Docs/spec, .devcontainer+scripts）
- **Application**: 2（frontend, backend）
- **Infrastructure**: 0（IaCなし。ローカル開発環境定義のみ）
- **Shared**: 0
- **Test**: 3（frontend/tests/unit, frontend/tests/e2e, backend/src/test/java）
- **Documentation**: 2（docs-next, Docs/spec）
