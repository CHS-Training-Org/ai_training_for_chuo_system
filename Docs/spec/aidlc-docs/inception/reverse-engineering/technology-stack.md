---
type: note
title: Technology Stack（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成した技術スタックの棚卸し
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-08-07
---

# Technology Stack

## Programming Languages

- TypeScript `^5.8.3` - フロントエンド
- Java 25（toolchain指定） - バックエンド

## Frameworks

- Next.js `^15.3.2`（App Router） - フロントエンド・BFF
- React `^19.1.0` / React DOM `^19.1.0` - UI
- Tailwind CSS `^4.1.8` - スタイリング
- Radix UI（shadcn/ui 基盤） - UIコンポーネントプリミティブ
- React Hook Form `^7.76.1` + Zod `^3.25.76` - フォーム・バリデーション
- Zustand `^5.0.3` - クライアント状態管理
- Better Auth `^1.2.7` - 認証クライアント
- Spring Boot `4.0.6` - バックエンドフレームワーク
- Spring Data JPA - ORM（issue #22 の `Sort`/`Pageable` 機構の基盤）
- Flyway（`spring-boot-flyway` + `flyway-database-postgresql`） - DBマイグレーション

## Infrastructure

- PostgreSQL（本番: `runtimeOnly`）、H2（テスト: `testRuntimeOnly`）
- Amazon Cognito（認証、本番）/ cognito-local（開発用）

## Build Tools

- pnpm `11.5.0` - frontend パッケージ管理
- Gradle（Kotlin DSL） - backend ビルド

## Testing Tools

- Vitest `^3.2.6` + `@testing-library/react` + MSW `^2.7.5` - frontend ユニットテスト
- Playwright `^1.52.0` - frontend E2E テスト
- JUnit 5 + H2 + Mockito - backend テスト

## Lint / Format

- oxlint `^1.6.0` / oxfmt `^0.52.0` - frontend
- Spotless（Google Java Format `1.28.0`） + Checkstyle（`toolVersion 13.4.2`） - backend
