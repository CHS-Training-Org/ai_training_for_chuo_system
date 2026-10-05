# Technology Stack

## Programming Languages

- Java - 25（Gradle toolchain 指定） - backend
- TypeScript - frontend / docs-next

## Frameworks

- Spring Boot - 4.0.6 - backend REST API フレームワーク
- Next.js - ^15.3.2 - フロントエンド + BFF（App Router）
- React - ^19.1.0 - UI ライブラリ
- Spring Data JPA - Spring Boot 4.0.6 同梱 - ORM（PostgreSQL）
- Flyway（flyway-core, flyway-database-postgresql） - Spring Boot 4.0.6 同梱 - DB マイグレーション
- Spring Security + OAuth2 Resource Server - Spring Boot 4.0.6 同梱 - JWT 検証・認可
- Springdoc OpenAPI - 3.0.1 - API ドキュメント生成
- Better Auth - ^1.2.7 - 認証クライアント（Cognito 連携）
- React Hook Form - ^7.76.1（+ `@hookform/resolvers` ^5.4.0） - フォーム管理（登録・更新フォームで使用）
- Zod - ^3.25.76 - スキーマバリデーション
- Zustand - ^5.0.3 - クライアント状態管理（最小限）
- Tailwind CSS - ^4.1.8 - スタイリング
- shadcn/ui（Radix UI ベース） - 各種 - UI コンポーネント

## Infrastructure

- PostgreSQL（Docker ローカル / Amazon RDS 本番） - 永続化層
- cognito-local（ローカル） / Amazon Cognito（本番） - JWT 発行

## Build Tools

- Gradle（Kotlin DSL） - backend ビルド
- pnpm - ^11.5.0 - frontend パッケージ管理
- npm - docs-next パッケージ管理

## Testing Tools

- JUnit 5 - backend ユニット・結合テスト
- Mockito - backend モック
- H2（testRuntimeOnly） - backend 結合テスト用インメモリ DB
- Spring Security Test - backend 認可テスト
- Vitest - ^3.2.6 - frontend ユニットテスト
- Playwright - ^1.52.0 - frontend E2E テスト
- MSW - ^2.7.5 - frontend API モック
- @testing-library/react - ^16.3.0 - frontend コンポーネントテスト

## Lint / Format

- Spotless（googleJavaFormat 1.28.0） / Checkstyle（13.4.2, `backend/config/checkstyle/checkstyle.xml`） - backend
- oxlint（^1.6.0） / oxfmt（^0.52.0） - frontend

## CI/CD

- GitHub Actions（`.github/workflows/ci-backend.yml`, `ci-frontend.yml`, `docs-check.yml`, `docs.yml`, `docs-preview.yml`, `label-sync.yml`, `claude.yml`）
