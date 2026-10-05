# Component Inventory

## Application Packages

- `frontend` - Next.js 15 App Router（UI + BFF）。App Router のページ・Server Actions・共有コンポーネント（55 ファイル、`.ts`/`.tsx`）
- `backend` - Spring Boot 4.0 REST API。domain / application / presentation / infrastructure の 4 レイヤー（58 ファイル、`.java`）

## Infrastructure Packages

- なし（本リポジトリはアプリケーションコードのみ。IaC・CDK/Terraform 定義は本リポジトリの対象外。AWS 標準構成は [`docs-next/docs/reference/architecture.md`](../../../../docs-next/docs/reference/architecture.md) に文書化のみ）

## Shared Packages

- `docs-next` - Docusaurus ドキュメントサイト（`docs/spec/` が仕様の真実の源）
- `Docs/spec` - AI-DLC エンジンの作業ファイル（本 RE 成果物もここに含まれる）

## Test Packages

- `backend/src/test` - JUnit 5 + Mockito（Service 単体）+ MockMvc（Controller）+ H2（`MODE=PostgreSQL`）
- `frontend/tests/unit` - Vitest + MSW（Server Actions・コンポーネント単体）
- `frontend/tests/e2e` - Playwright（E2E、本課題の対象外）

## Total Count

- **Total Packages**: 2（frontend / backend、アプリケーションコードのみ）
- **Application**: 2
- **Infrastructure**: 0
- **Shared**: 2（docs-next / Docs/spec、ドキュメント用途）
- **Test**: frontend・backend それぞれに同梱（別パッケージ化なし）
