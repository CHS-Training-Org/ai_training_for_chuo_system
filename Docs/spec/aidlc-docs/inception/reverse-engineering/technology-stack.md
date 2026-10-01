---
type: working-doc
title: Technology Stack（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成する技術スタック資料（実ファイルで確認したバージョン）
timestamp: 2026-09-29
---

# Technology Stack

## Programming Languages

- TypeScript - frontend/package.json 準拠 - フロントエンド全体
- Java 25 - build.gradle.kts の toolchain 指定 - バックエンド全体

## Frameworks

- Next.js `^15.3.2`（App Router） - フロントエンド + BFF
- React `^19.1.0` - UIレイヤー
- Spring Boot `4.0.6` - バックエンドAPI
- Spring Data JPA（Spring Boot 4.0.6同梱） - 永続化層
- Spring Security + OAuth2 Resource Server（Spring Boot 4.0.6同梱） - 認証・認可

## Infrastructure

- PostgreSQL - 本番DB
- H2（PostgreSQL互換モード） - テスト用DB
- Flyway（`spring-boot-flyway` + `flyway-database-postgresql`） - DBマイグレーション

## Build Tools

- pnpm `11.5.0` - frontend パッケージ管理
- Gradle（Kotlin DSL） - backend ビルド
- Spotless `8.5.1`（google-java-format `1.28.0`） - backend フォーマット
- Checkstyle `13.4.2` - backend 静的解析（severity=warning だが `isIgnoreFailures=false`）
- oxlint `^1.6.0` / oxfmt `^0.52.0` - frontend Lint/フォーマット

## Testing Tools

- Vitest `^3.2.6` - frontend ユニットテスト
- MSW `^2.7.5` - frontend APIモック
- Playwright `^1.52.0` - frontend E2Eテスト
- JUnit 5 + Mockito + H2（`spring-boot-starter-test`, `spring-security-test`） - backend テスト
