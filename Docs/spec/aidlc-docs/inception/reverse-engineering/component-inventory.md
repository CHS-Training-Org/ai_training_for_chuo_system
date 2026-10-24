# Component Inventory

## Application Packages
- `backend` - Spring Boot REST API（Controller 6 / Service 5 / エンティティ 5）
- `frontend` - Next.js BFF + UI（Server Actions 6 ファイル、認証後画面 10 ページ + サインイン画面）

## Infrastructure Packages
- `.devcontainer`（Docker Compose）, `scripts/provision-cognito.sh` - ローカル環境

## Shared Packages
- なし

## Test Packages
- `backend/src/test` - Unit + Integration（JUnit 5 + Mockito + H2、MockMvc による Controller 結合テスト）
- `frontend/tests/unit` - Unit（Vitest + MSW、jsdom）
- `frontend/tests/e2e` - E2E（Playwright。`example.spec.ts` のみ）

## Other
- `docs-next`（Docusaurus、仕様書の真実の源）, `ops-note`（運営ノート）, `Docs/spec`（AI-DLC 作業ファイル）

## Total Count
- **Total Packages**: 5（backend / frontend / docs-next / ops-note / scripts）
- **Application**: 2
- **Infrastructure**: 1
- **Shared**: 0
- **Test**: backend・frontend に内包
