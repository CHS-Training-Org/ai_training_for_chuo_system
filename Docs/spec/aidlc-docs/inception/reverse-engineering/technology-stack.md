# Technology Stack

## Programming Languages
- TypeScript - frontend 全体（`.ts` / `.tsx`）
- Java 25 - backend 全体

## Frameworks
- Next.js 15（App Router） - frontend / BFF
- React 19 - frontend UI
- Tailwind CSS v4 + shadcn/ui - frontend スタイリング・UI コンポーネント
- React Hook Form + Zod - frontend フォーム・バリデーション
- Zustand - frontend クライアント状態管理（最小限）
- Better Auth（+ Cognito） - frontend 認証クライアント
- Spring Boot 4.0.6 - backend アプリケーションフレームワーク
- Spring Data JPA - backend ORM
- Spring Security + OAuth2 Resource Server - backend 認証・認可
- Springdoc OpenAPI 3.0.1 - backend API ドキュメント自動生成
- Docusaurus（TypeScript / React） - docs-next ドキュメントサイト

## Infrastructure
- Amazon Cognito（本番） / cognito-local（ローカル） - 認証基盤
- Amazon RDS for PostgreSQL（本番） / Docker `postgres` コンテナ（ローカル） - データベース
- Amazon ECS Fargate + ECR（本番、ドキュメント上のみ） - コンテナ実行基盤
- LocalStack - ローカルでの AWS サービスエミュレーション（DevContainer 内、`docker-compose.yml` の `localstack` サービス）

## Build Tools
- Gradle（Kotlin DSL）+ Gradle Wrapper - backend ビルド
- pnpm - frontend パッケージ管理
- npm - docs-next パッケージ管理

## Testing Tools
- JUnit 5 + H2（インメモリ DB） + Mockito - backend テスト
- Vitest + Playwright + MSW - frontend テスト（ユニット / E2E / API モック）

## Lint / Format
- Spotless（googleJavaFormat） + Checkstyle - backend
- oxlint + oxfmt - frontend

## DB マイグレーション
- Flyway（`org.flywaydb:flyway-core` + `flyway-database-postgresql`。Spring Boot 4.0 で自動構成が分離されたため `spring-boot-flyway` を明示的に依存追加）
