# Technology Stack

## Programming Languages
- Java 25 - バックエンド
- TypeScript 5.8 - フロントエンド

## Frameworks
- Spring Boot 4.0.6（Web、Data JPA、Security OAuth2 Resource Server、Validation）
- Next.js 15 / React 19 / Tailwind CSS v4 / shadcn/ui
- Spring Boot 4.0 は Jackson 3.x を自動構成するため、テストでは Jackson 2.x の `ObjectMapper` を直接生成している

## Infrastructure
- PostgreSQL、Flyway（`V001__create_initial_schema.sql` のみ）、cognito-local

## Build Tools
- Gradle wrapper、pnpm 11.5

## Testing Tools
- JUnit 5、H2、Spring Security Test、Vitest 3、MSW 2、Playwright
