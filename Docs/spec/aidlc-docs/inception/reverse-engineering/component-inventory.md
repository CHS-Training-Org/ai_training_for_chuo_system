# Component Inventory

## Application Packages
- `backend` - Spring Boot REST API
- `frontend` - Next.js BFF + UI

## Infrastructure Packages
- `.devcontainer`（Docker Compose）, `scripts/provision-cognito.sh` - ローカル環境

## Shared Packages
- なし

## Test Packages
- `backend/src/test`（JUnit 5 + Mockito + H2）, `frontend/tests/unit`（Vitest + MSW）, `frontend/tests/e2e`（Playwright）

## Other
- `docs-next`（Docusaurus）, `ops-note`

## Total Count
- **Total Packages**: 5（backend / frontend / docs-next / ops-note / scripts）
- **Application**: 2
- **Infrastructure**: 1
- **Shared**: 0
- **Test**: backend・frontend 内包
