---
type: note
title: Component Inventory（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成したパッケージ構成の棚卸し
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-08-07
---

# Component Inventory

## Application Packages

- `frontend` - Next.js 15（App Router）による UI + BFF
- `backend` - Spring Boot 4.0（Java 25）による REST API

## Infrastructure Packages

- なし（本リポジトリはアプリケーションコードのみ。IaC定義は対象外）

## Shared Packages

- `frontend/src/lib` - 型定義（`types`）・スキーマ（`schemas`）・ラベル定数・認証設定
- `backend/src/main/java/com/example/bookflow/domain` - エンティティ・Repositoryインターフェース

## Test Packages

- `frontend/tests/unit` - Vitest ユニットテスト（Server Actions・lib 中心）
- `frontend/tests/e2e` - Playwright E2E テスト
- `backend/src/test` - JUnit 5 + H2 + Mockito ユニット/統合テスト

## Total Count

- **Total Packages**: 2（frontend, backend）
- **Application**: 2
- **Infrastructure**: 0
- **Shared**: 2（lib, domain）
- **Test**: 3（frontend unit, frontend e2e, backend test）
