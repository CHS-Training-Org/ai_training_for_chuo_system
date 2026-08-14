---
type: note
title: Build Instructions（resource-list-sort）
description: AI-DLC Build and Test ステージが生成したリソース一覧ソート機能のビルド手順
tags:
  - ai-dlc
  - build-and-test
timestamp: 2026-08-13
---

# Build Instructions — リソース一覧ソート機能

本課題は既存の BookFlow モノレポ（`backend/`・`frontend/`）への変更であり、新規のビルドツール・依存関係・環境変数は追加していない。ビルド手順は `CLAUDE.md`「よく使うコマンド」節に記載の既存手順をそのまま使う。

## バックエンド

```bash
cd backend
./gradlew compileJava compileTestJava
```

- **ビルドツール**: Gradle（Kotlin DSL）、Java 25、Spring Boot 4.0
- **成果物確認**: コンパイルエラーがないこと（`BUILD SUCCESSFUL`）

## フロントエンド

```bash
cd frontend
pnpm build
```

- **ビルドツール**: Next.js 15（App Router）、pnpm
- **成果物確認**: `next build` の型チェック（`Linting and checking validity of types`）がエラーなく完了し、`Route (app)` 一覧に `/resources` が含まれること
