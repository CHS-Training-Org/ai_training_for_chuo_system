# Technology Stack

## Programming Languages

- Java 25（backend）
- TypeScript 5.8.3（frontend）

## Frameworks

- Spring Boot 4.0.6（backend） - REST API・DI・トランザクション管理
- Spring Data JPA（backend） - 永続化
- Spring Security + OAuth2 Resource Server（backend） - JWT 検証・認可
- Next.js 15.3.2（App Router）（frontend） - UI・BFF
- React 19.1.0（frontend）
- React Hook Form + Zod（frontend） - フォーム・バリデーション

## Infrastructure

- PostgreSQL（本番・開発、Flyway でスキーマ管理）
- H2（テスト、PostgreSQL 互換モード）
- Amazon Cognito（認証、ローカルは cognito-local）

## Build Tools

- Gradle（Kotlin DSL）（backend）
- pnpm（frontend）

## Testing Tools

- JUnit 5 + Mockito + H2（backend）
- Vitest + Testing Library + MSW（frontend ユニット）
- Playwright（frontend E2E）

## Lint / Format

- Spotless + Checkstyle（backend）
- oxlint + oxfmt（frontend）

本課題（Issue #25）は既存スタックの範囲内で完結し、新規依存関係の追加は不要（Flyway マイグレーション追加・既存 DTO/エンティティの拡張のみ）。
