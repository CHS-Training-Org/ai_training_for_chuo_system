# Component Inventory

## Application Packages
- `backend`（Spring Boot） - REST API
- `frontend`（Next.js） - BFF と UI

## Infrastructure Packages
- `.devcontainer`（Docker Compose） - ローカル PostgreSQL ほか

## Shared Packages
- なし

## Test Packages
- `backend/src/test`（JUnit 5 + Mockito + H2） - Unit
- `frontend/tests/unit`（Vitest + MSW）、`frontend/tests/e2e`（Playwright） - Unit / E2E

## Total Count
- **Total Packages**: 3（backend / frontend / .devcontainer。docs-next は対象外）
- **Application**: 2
- **Infrastructure**: 1
- **Shared**: 0
- **Test**: 2（上記のテストは各 Application 内に同居）
