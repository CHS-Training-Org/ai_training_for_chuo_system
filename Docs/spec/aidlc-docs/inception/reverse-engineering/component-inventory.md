# Component Inventory

## Application Packages
- `backend` - Spring Boot API（Java 78 ファイル、テスト含む）
- `frontend` - Next.js（TypeScript 55 ファイル、テスト含む）

## Infrastructure Packages
- `.devcontainer` - Docker Compose（PostgreSQL、cognito-local ほか）

## Shared Packages
- なし

## Test Packages
- `backend/src/test` - JUnit 5 + H2 + MockMvc（Controller 結合テスト 6 本、Service テスト 3 本、`ResourceSpecificationsTest`）
- `frontend/tests/unit` - Vitest + MSW
- `frontend/tests/e2e` - Playwright（`example.spec.ts` のみ）

## Documentation Packages
- `docs-next` - Docusaurus。`docs/spec/` が真実の源

## Total Count
- **Total Packages**: 5
- **Application**: 2
- **Infrastructure**: 1
- **Shared**: 0
- **Test**: 3（上記テスト領域）
