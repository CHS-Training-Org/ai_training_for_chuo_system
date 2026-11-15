---
type: working-doc
title: Build Instructions（Build and Test）
description: AI-DLC Build and Test ステージのビルド手順（ユニット reservation-draft）
timestamp: 2026-11-14
---

# Build Instructions

## Prerequisites

- **Build Tool**: Gradle Wrapper（backend）/ pnpm（frontend）
- **Dependencies**: `backend/build.gradle.kts`・`frontend/package.json` に既存定義済み（本ユニットでの追加依存なし）
- **Environment Variables**: 既存の `.devcontainer` / `frontend/.env.local` 設定をそのまま使用（本ユニットでの追加設定なし）
- **DB**: Flyway マイグレーションの追加なし（`V001` のみ。`reservations.status` 列に `DRAFT` を入れられる既存の定義を使う）
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

- **Expected Output**: backend は `BUILD SUCCESSFUL`、frontend は全 11 ルートの静的生成完了（`/reservations/[id]` と `/reservations/[id]/edit` を含む）
- **Build Artifacts**: `backend/build/libs/*.jar`、`frontend/.next/`
- **Common Warnings**: backend の Checkstyle は既存コード由来のテストメソッド命名警告（`severity=warning`）が出るが、ビルド失敗の原因にはならない（既知の許容事項）

## Troubleshooting

### Build Fails with Compilation Errors

- **Cause（backend）**: `CreateReservationRequest` / `UpdateReservationRequest` の最後に `Boolean draft` を足したため、DTO を `new` している既存のテストの呼び出しに `null` の引数が足りない
- **Solution**: 呼び出し側の末尾に `null` を足す（`ReservationServiceTest` で 10 か所対応済み）
- **Cause（frontend）**: `createReservationAction` / `updateReservationAction` の第 3 引数 `options` の型が合っていない
- **Solution**: `frontend/src/server/actions/reservations.ts` のシグネチャ（`options?: { draft?: boolean }`）と照合する
