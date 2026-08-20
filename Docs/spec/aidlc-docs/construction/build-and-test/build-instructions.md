---
type: spec
title: Build Instructions - resource-keyword-filter
description: リソースキーワード検索機能のビルド手順（AI-DLC Build and Test 成果物）
tags:
  - ai-dlc
  - build-and-test
  - resource
timestamp: 2026-08-17
audience: 学習者・メンター
references:
  - Docs/spec/aidlc-docs/construction/plans/resource-keyword-filter-code-generation-plan.md
---

# Build Instructions - resource-keyword-filter

本ユニットは既存の `backend`／`frontend` パッケージ内のファイル修正のみで完結する（新規パッケージ・新規依存の追加なし）。ビルド手順は `CLAUDE.md` の「よく使うコマンド」に定義された既存手順をそのまま使う。

## バックエンド

```bash
cd backend
./gradlew clean build
```

- **ビルドツール**: Gradle（Kotlin DSL）、Java 25
- **依存追加**: なし（既存の Spring Data JPA・Spring Web の範囲内）
- **想定結果**: `BUILD SUCCESSFUL`。`build/libs/` に jar が生成される

## フロントエンド

```bash
cd frontend
pnpm install
pnpm build
```

- **ビルドツール**: Next.js（App Router）、pnpm
- **依存追加**: なし
- **想定結果**: `.next/` にビルド成果物が生成される。型エラー・ESLint エラーなし

## 静的解析・フォーマット確認

```bash
cd backend && ./gradlew spotlessCheck checkstyleMain
cd frontend && pnpm lint && pnpm format:check
```

`checkstyleMain` は本ユニットと無関係な `ReservationRepository` 由来の既存警告2件（`MethodName` ルール）が出るが、これは本変更前から存在するものであり対象外とする。
