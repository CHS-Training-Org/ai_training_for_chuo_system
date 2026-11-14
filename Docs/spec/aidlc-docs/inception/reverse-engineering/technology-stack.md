---
type: working-doc
title: Technology Stack（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成する技術スタック資料（今回のスコープ：予約の下書き保存）
timestamp: 2026-11-14
---

# Technology Stack

**出典**: リポジトリの `CLAUDE.md` の技術スタック表と、`application.yml` / `application-test.yml` の確認結果。個別ライブラリのバージョンは `frontend/package.json` / `backend/build.gradle.kts` を参照（今回のスコープでは変更しない）。

## Programming Languages
- TypeScript - frontend
- Java 25 - backend

## Frameworks
- Next.js 15（App Router）/ React 19 - UI と BFF
- Spring Boot 4.0 - REST API
- Spring Data JPA - ORM（PostgreSQL）
- Spring Security + OAuth2 Resource Server - 認証・認可

## Infrastructure
- PostgreSQL - 本番・ローカルの DB
- H2（PostgreSQL モード）- バックエンドテスト用（Hibernate が `create-drop` でテーブルを作る）
- Flyway - DB マイグレーション（現在は `V001` のみ）

## Build Tools
- pnpm - frontend
- Gradle（Kotlin DSL）- backend

## Testing Tools
- Vitest + MSW + Playwright - frontend
- JUnit 5 + Mockito + H2 - backend
- oxlint / oxfmt（FE）、Spotless / Checkstyle（BE） - Lint / Format
