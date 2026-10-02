# Technology Stack

## Programming Languages
- Java - 25 - backend
- TypeScript - ^5.8.3 - frontend

## Frameworks
- Spring Boot - 4.0.6 - backend（Web / Data JPA / Validation / OAuth2 Resource Server）
- Next.js - ^15.3.2（App Router） - frontend
- React - ^19.1.0 - frontend
- Tailwind CSS - ^4.1.8 / shadcn/ui - スタイリング
- Zod - ^3.25.76 - API レスポンス・フォーム検証
- Zustand - ^5.0.3 - クライアント状態（最小限）

## Infrastructure
- PostgreSQL - 本番・ローカル DB（Flyway でマイグレーション）
- Amazon Cognito / cognito-local - 認証
- GitHub Actions - CI

## Build Tools
- Gradle（Kotlin DSL、wrapper）- backend
- pnpm - frontend

## Testing Tools
- JUnit 5 + Mockito + H2 + spring-security-test - backend
- Vitest ^3.2.6 + MSW ^2.7.5 + Playwright - frontend
- Spotless（google-java-format 1.28.0）+ Checkstyle 13.4.2 - backend の整形・静的解析
- oxlint ^1.6.0 + oxfmt ^0.52.0 - frontend の lint・整形
