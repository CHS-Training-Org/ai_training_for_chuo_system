# Technology Stack

> 出典：`CLAUDE.md`（リポジトリルート）の技術スタック表と一致することを確認済み。

## Programming Languages

- TypeScript - フロントエンド（Next.js）
- Java 25 - バックエンド（Spring Boot 4.0）

## Frameworks

- Next.js 15（App Router） / React 19 - フロントエンド
- Tailwind CSS v4 / shadcn/ui - スタイリング・UI コンポーネント
- React Hook Form + Zod - フォーム
- Zustand - クライアント状態管理（最小限）
- Better Auth + Cognito - 認証クライアント
- Spring Boot 4.0 / Spring Data JPA / Spring Security（OAuth2 Resource Server） - バックエンド
- Flyway - DB マイグレーション
- Springdoc OpenAPI - API ドキュメント

## Infrastructure

- PostgreSQL（ローカルは Docker Compose）
- Amazon Cognito（ローカルは cognito-local）

## Build Tools

- pnpm - フロントエンド
- Gradle（Kotlin DSL） - バックエンド

## Testing Tools

- Vitest + Playwright + MSW - フロントエンド
- JUnit 5 + H2 + Mockito - バックエンド

## Lint / Format

- oxlint + oxfmt - フロントエンド
- Spotless + Checkstyle - バックエンド

## CSV 帳票出力タスクに関する現状

- CSV 生成用ライブラリ（`opencsv` 等）は `backend/build.gradle.kts` に**未導入**。要件分析・NFR 設計で選定する（エンハンス要求シートの AI 活用ポイントで `opencsv` vs 手書き `StringBuilder` の比較が示唆されている）
- 大量データのストリーミング出力（`StreamingResponseBody`）も未導入。同様に NFR 設計で検討する
