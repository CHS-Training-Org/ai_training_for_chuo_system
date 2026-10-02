# Technology Stack

> `CLAUDE.md`（リポジトリコンテキスト）の技術スタック表と一致する。以下は実際の設定ファイルから確認した値である。

## Programming Languages

- Java — 25 — バックエンド全体
- TypeScript — 5.8 系 — フロントエンド全体・Docusaurus 設定
- SQL — PostgreSQL 方言 — Flyway マイグレーション

## Frameworks

- Spring Boot — 4.0.6 — バックエンドのアプリケーションフレームワーク
- Spring Data JPA — Spring Boot BOM 管理 — 永続化
- Spring Security / OAuth2 Resource Server — Spring Boot BOM 管理 — JWT 検証と認可
- Next.js — 15.3 系 — App Router によるフロントエンド
- React — 19.1 系 — UI
- Tailwind CSS — 4.1 系 — スタイリング
- shadcn/ui（Radix UI ベース） — UI コンポーネント
- React Hook Form — 7.76 系 — フォーム
- Zod — 3.25 系 — スキーマ検証
- Zustand — 5.0 系 — クライアント状態（最小限）
- Better Auth — 1.2 系 — 認証クライアント

## Infrastructure

- PostgreSQL — 本番・開発の永続化
- H2 — テスト用インメモリ DB（`MODE=PostgreSQL`）
- Amazon Cognito — 認証基盤。ローカルは cognito-local で代替する
- Docker Compose — ローカルサービス起動
- GitHub Actions — CI

## Build Tools

- Gradle（Kotlin DSL）— Gradle Wrapper 経由 — バックエンドのビルドとテスト
- pnpm — 11.5.0 — フロントエンドのパッケージ管理
- npm — docs-next のビルド
- Flyway — 10 系（`flyway-core` / `flyway-database-postgresql`）— DB マイグレーション
- Springdoc OpenAPI — 3.0.1 — API ドキュメント生成

## Testing Tools

- JUnit 5 — `spring-boot-starter-test` 経由 — バックエンド単体・結合テスト
- Mockito — 同上 — Service 層の単体テスト（strict stubs）
- MockMvc / `spring-security-test` — Controller 層のテスト
- AssertJ — アサーション
- Vitest — 3.2 系 — フロントエンド単体テスト
- Testing Library — 16.3 系 — コンポーネントテスト
- MSW — 2.7 系 — API モック
- Playwright — 1.52 系 — E2E テスト

## Lint / Format

- Spotless — 8.5.1 — Java フォーマット（`./gradlew spotlessApply`）
- Checkstyle — Java 静的解析（`./gradlew checkstyleMain`）
- oxlint — 1.6 系 — TypeScript lint
- oxfmt — 0.52 系 — TypeScript フォーマット
