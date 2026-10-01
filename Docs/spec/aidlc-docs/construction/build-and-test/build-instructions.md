---
type: working-doc
title: Build Instructions（Build and Test）
description: AI-DLC Build and Test ステージのビルド手順
timestamp: 2026-10-01
---

# Build Instructions

## Prerequisites

- **Build Tool**: Gradle Wrapper（backend）/ pnpm（frontend）
- **Dependencies**: `backend/build.gradle.kts`・`frontend/package.json` に既存定義済み（本ユニットでの追加依存なし）
- **Environment Variables**: 既存の `.devcontainer` / `frontend/.env.local` 設定をそのまま使用（本ユニットでの追加設定なし）
- **System Requirements**: Java 25、Node.js（pnpm 11.5.0）

## Build Steps

### 1. Install Dependencies

```bash
cd backend && ./gradlew dependencies -q > /dev/null  # 初回のみ依存解決
cd frontend && pnpm install
```

### 2. Configure Environment

追加設定は不要（既存の `.devcontainer/docker-compose.yml` ・ `frontend/.env.local` をそのまま使用）。

### 3. Build

```bash
cd backend && ./gradlew build
cd frontend && pnpm build
```

### 4. Verify Build Success

- **Expected Output**: backend は `BUILD SUCCESSFUL`、frontend は `Compiled successfully` と全11ルートの静的生成完了
- **Build Artifacts**: `backend/build/libs/*.jar`、`frontend/.next/`
- **Common Warnings**: backend の Checkstyle は既存コード由来のテストメソッド命名警告（`severity=warning`）が多数出るが、ビルド失敗の原因にはならない（既知の許容事項）

## Troubleshooting

### Build Fails with Compilation Errors

- **Cause**: `ResourceRepository.search()` のオーバーロード（Page版・List版）の引数順を間違えている可能性
- **Solution**: `domain-entities.md`・`business-logic-model.md`（Functional Design）のシグネチャ定義と照合する
