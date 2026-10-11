# Technology Stack

## Programming Languages
- Java 25（backend）/ TypeScript（frontend）

## Frameworks
- Spring Boot 4.0 + Spring Data JPA + Spring Security（OAuth2 Resource Server）
- Next.js 15 / React 19 / Tailwind CSS v4 / shadcn/ui / React Hook Form + Zod / Zustand

## Infrastructure
- PostgreSQL（Flyway: `V001__create_initial_schema.sql` のみ）、Cognito（cognito-local）

## Build Tools
- Gradle wrapper / pnpm、Spotless + Checkstyle / oxlint + oxfmt

## Testing Tools
- JUnit 5, Mockito, H2（ADR-018）/ Vitest, MSW, Playwright
- CI: `.github/workflows/ci-backend.yml`, `ci-frontend.yml`
