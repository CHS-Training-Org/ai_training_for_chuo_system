# Technology Stack

> 全体の技術スタックは既存の [`CLAUDE.md`](../../../../../CLAUDE.md) §技術スタックを出典とする。ここでは今回のタスクに直接関わる依存関係のバージョンのみ記載する（`backend/build.gradle.kts` / `frontend/package.json` から採取）。

## Programming Languages
- Java 25（`java.toolchain.languageVersion`）
- TypeScript 5.8.3

## Frameworks
- Spring Boot 4.0.6 - バックエンド API フレームワーク
- Spring Data JPA（Spring Boot BOM 管理）- `ResourceRepository` の基盤
- Next.js 15.3.2（App Router）- フロントエンド + BFF
- React 19.1.0
- React Hook Form 7.76.1 + Zod 3.25.76 - フォームバリデーション（`ResourceFilterForm` は現状 FormData 直接読み取りで RHF/Zod 未使用）

## Infrastructure
- PostgreSQL（Docker、`docker-compose.yml`）- `resources` テーブル
- Flyway（`flyway-core` + `flyway-database-postgresql`）- スキーマ管理

## Build Tools
- Gradle（Kotlin DSL）+ Spring Boot Gradle Plugin
- pnpm 11.5.0

## Testing Tools
- JUnit 5 + Mockito + H2（バックエンド、`spring-boot-starter-test`）
- Vitest 3.2.6（フロントエンド）
- Spotless（Google Java Format 1.28.0）+ Checkstyle 13.4.2（バックエンド Lint）
- oxlint 1.6.0 + oxfmt 0.52.0（フロントエンド Lint）
