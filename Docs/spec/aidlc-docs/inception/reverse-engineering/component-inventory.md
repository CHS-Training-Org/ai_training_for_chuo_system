# Component Inventory

## Application Packages
- `backend` - Spring Boot REST API
- `frontend` - Next.js BFF + UI

## Infrastructure Packages
- `.devcontainer` - Docker Compose - ローカル開発環境（PostgreSQL、cognito-local、docs サービス）

## Shared Packages
- なし

## Test Packages
- `backend/src/test` - JUnit 5 + Mockito（Service 単体）+ H2/MockMvc（Controller 統合）
- `frontend/tests/unit` - Vitest + MSW
- `frontend/tests/e2e` - Playwright（現状は `example.spec.ts` のみ）

## Other
- `docs-next` - Docusaurus ドキュメントサイト
- `ops-note` - 運営ノート（静的 HTML）

## Total Count
- **Total Packages**: 6
- **Application**: 2
- **Infrastructure**: 1
- **Shared**: 0
- **Test**: 3（上記アプリ内に同居）
