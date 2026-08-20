---
type: note
title: Build Instructions
description: カレンダービュー（Unit：calendar-view）のビルド手順（frontendのみ、バックエンド変更なし）
tags:
  - ai-dlc
  - build-and-test
timestamp: 2026-08-20
---

# Build Instructions — カレンダービュー（Unit: calendar-view）

## Prerequisites

- **Build Tool**: pnpm（frontend）。本課題はfrontendのみの変更のため、バックエンドのビルドは対象外。
- **Dependencies**: 追加の依存パッケージなし（既存の`package.json`のまま。外部カレンダーライブラリは導入していない）。
- **Environment Variables**: 追加の環境変数なし。
- **System Requirements**: 既存のBookFlow devcontainer環境（Node.js、pnpm）。

## Build Steps

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

### 2. Configure Environment

追加設定は不要（既存の`.env.local`をそのまま使用）。

### 3. Build

```bash
pnpm build
```

### 4. Verify Build Success

- **Expected Output**: `✓ Compiled successfully`、型チェックエラーなし、`Route (app)`一覧に`/resources/[id]`・`/reservations/new`が表示される。
- **Build Artifacts**: `frontend/.next/`（本課題専用の成果物はなし、既存ビルドに統合される）。
- **Common Warnings**: なし（実行時、警告ゼロで成功を確認済み）。

## Troubleshooting

### Build Fails with Type Errors

- **Cause**: `calendar-logic.ts`の型（`CalendarViewMode`・`HourSlotStatus`・`DaySummary`）とコンポーネントPropsの不整合。
- **Solution**: `Docs/spec/aidlc-docs/construction/calendar-view/functional-design/domain-entities.md`の型定義と実装を突き合わせる。
