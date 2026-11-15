---
type: working-doc
title: Component Inventory（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成するコンポーネント一覧（今回のスコープ：予約の下書き保存）
timestamp: 2026-11-14
---

# Component Inventory

**スコープ注記**: リポジトリ全体ではなく、予約の下書き保存に関わる範囲。

## Application Packages
- `backend/`（Spring Boot） - 予約・承認・リソースの REST API（4 層）
- `frontend/`（Next.js） - BFF（Server Actions）と UI

## Infrastructure Packages
- なし（CDK / Terraform は使っていない。ローカルは `.devcontainer/` の Docker Compose）

## Shared Packages
- なし（FE と BE で型の共有パッケージは無く、FE は `FE/lib/types/api.ts` の Zod スキーマで応答を検証する）

## Test Packages
- `backend/src/test/` - JUnit 5 + Mockito（Service）+ H2（Controller）
- `frontend/tests/unit/` - Vitest + MSW
- `frontend/tests/e2e/` - Playwright（予約関連の e2e は無い。`example.spec.ts` の 1 件のみ）

## Total Count
- **Total Packages**: 2（アプリケーション）+ テスト用ディレクトリ 3
- **Application**: 2
- **Infrastructure**: 0
- **Shared**: 0
- **Test**: 3
