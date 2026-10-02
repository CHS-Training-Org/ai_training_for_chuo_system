# Technology Stack

> 網羅的な技術スタック一覧は [`/workspace/CLAUDE.md`](../../../../CLAUDE.md) §技術スタック、AWS 標準構成は [`docs-next/docs/reference/architecture.md`](../../../../docs-next/docs/reference/architecture.md) を参照。本ファイルは Issue #23 の実装判断に関係する項目のみ抜粋する。

## Programming Languages

- TypeScript - `frontend/` 全体
- Java 25 - `backend/` 全体

## Frameworks

- Next.js 15（App Router） - frontend の UI + BFF
- React 19 - frontend の UI コンポーネント
- Zod 3.25 - フォーム・入力バリデーション（`frontend/src/lib/schemas/`）
- Spring Boot 4.0.6 - backend の REST API 基盤
- Spring Data JPA - backend のデータアクセス（`ResourceRepository` 等）
- Flyway - backend の DB マイグレーション（`V001__create_initial_schema.sql` 等）

## Infrastructure

- PostgreSQL（本番、`docker compose` でローカル代替） - `resources` テーブルの永続化先
- H2（テスト、`MODE=PostgreSQL` 互換モード） - `backend/src/test/resources/application-test.yml`

## Build Tools

- pnpm 11.5.0 - frontend パッケージ管理
- Gradle（Kotlin DSL） + Spring Boot Gradle Plugin 4.0.6 - backend ビルド
- Spotless 8.5.1 + Checkstyle - backend フォーマット・Lint
- oxlint 1.6.0 + oxfmt 0.52.0 - frontend Lint・フォーマット

## Testing Tools

- Vitest 3.2.6 + MSW 2.7.5 - frontend ユニットテスト（`listResourcesAction` 等をモックサーバー経由でテスト）
- Playwright 1.52.0 - frontend E2E テスト
- JUnit 5 + Mockito（`spring-boot-starter-test`） - backend ユニットテスト
- MockMvc - backend Controller テスト
