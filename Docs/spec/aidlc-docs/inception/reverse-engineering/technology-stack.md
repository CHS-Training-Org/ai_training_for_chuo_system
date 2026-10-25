# Technology Stack

## Programming Languages
- Java - 25 - backend
- TypeScript - frontend（Next.js）

## Frameworks
- Spring Boot - 4.0 - REST API（Spring Data JPA、Spring Security OAuth2 Resource Server、Validation）
- springdoc-openapi - 3.0.1 - API ドキュメント
- Next.js - ^15.3.2 - App Router（BFF + UI）
- React - ^19.1.0 - UI
- Tailwind CSS v4 / shadcn/ui - スタイリングと UI 部品
- React Hook Form ^7.76.1 + Zod ^3.25.76 - フォームと型検証
- Better Auth - ^1.2.7 - 認証クライアント
- Zustand - ^5.0.3 - クライアント状態（最小限）

## Infrastructure
- PostgreSQL - 本番・ローカル DB（Flyway: `V001__create_initial_schema.sql` のみ）
- Cognito（ローカルは cognito-local） - JWT 発行

## Build Tools
- Gradle wrapper（Kotlin DSL） - backend ビルド。Spotless + Checkstyle
- pnpm - frontend パッケージ管理。oxlint + oxfmt

## Testing Tools
- JUnit 5 / Mockito / spring-security-test / H2 - backend（ADR-018）
- Vitest ^3.2.6 / MSW ^2.7.5 / Testing Library - frontend ユニット
- Playwright ^1.52.0 - frontend E2E
- CI: `.github/workflows/ci-backend.yml`, `ci-frontend.yml`

## CSV 関連
- backend・frontend とも CSV 生成・パース用ライブラリは未導入（`opencsv` 等なし）
