# Technology Stack

## Programming Languages

- TypeScript - ^5.8.3 - frontend 全体
- Java - 25（toolchain指定） - backend 全体

## Frameworks

- Next.js - ^15.3.2 - フロントエンド（App Router、Server Components/Server Actions）
- React - ^19.1.0 - UIライブラリ
- Tailwind CSS - ^4.1.8（v4、`@theme inline` 構文） - スタイリング
- shadcn/ui - （`components.json` 経由、style=default） - UIコンポーネント基盤
- Better Auth - ^1.2.7（コード内コメントは1.6.11系挙動前提） - 認証クライアント（Cognito連携）
- React Hook Form - ^7.76.1 - フォーム状態管理
- Zod - ^3.25.76 - スキーマバリデーション・型定義
- Zustand - ^5.0.3 - 状態管理ライブラリ（依存関係にあるがコード内使用箇所は確認できず）
- Spring Boot - 4.0.6 - バックエンドアプリケーションフレームワーク
- Spring Data JPA - （Boot BOM管理） - ORM
- Spring Security + OAuth2 Resource Server - （Boot BOM管理） - 認証・認可
- Flyway（flyway-core, flyway-database-postgresql, spring-boot-flyway） - （Boot BOM管理 + 明示追加） - DBマイグレーション
- springdoc-openapi-starter-webmvc-ui - 3.0.1 - API ドキュメント自動生成

## Infrastructure

- PostgreSQL 16 - アプリケーションデータの永続化（ローカルは Docker Compose）
- Amazon Cognito / cognito-local - 認証基盤（ローカルはコンテナ版で代替）
- localstack（S3/DynamoDB） - ローカル開発環境に定義のみ、アプリケーションコードからの利用箇所は現状なし

## Build Tools

- pnpm - 11.5.0 - frontend パッケージ管理
- Gradle（Kotlin DSL） - wrapper 9.5.1 - backend ビルド
- npm - docs-next（Docusaurus）パッケージ管理
- Spotless（プラグイン 8.5.1、googleJavaFormat 1.28.0） - backend コードフォーマット
- Checkstyle（プラグイン、toolVersion 13.4.2） - backend 静的解析（`isIgnoreFailures = false`）
- oxlint 1.6.0 / oxfmt 0.52.0 - frontend lint/format

## Testing Tools

- Vitest - ^3.2.6 - frontend ユニットテスト
- @testing-library/react - ^16.3.0 - frontend コンポーネントテスト補助
- MSW - ^2.7.5 - frontend の Server Actions テストにおけるバックエンドAPIスタブ
- Playwright - ^1.52.0 - frontend E2Eテスト
- JUnit 5（spring-boot-starter-test 経由） - backend テストフレームワーク
- Mockito（spring-boot-starter-test 経由、build.gradle.kts上の直接宣言なし） - backend モック
- H2（testRuntimeOnly） - backend テスト用インメモリDB
- spring-security-test - backend セキュリティテスト支援
