# Build Instructions

## Prerequisites
- **Build Tool**: pnpm（frontend）、npm（docs-next）。backend は今回変更しないためビルド対象外
- **Node.js**: v24 系（確認時は v24.21.0）
- **System Requirements**: 追加なし。新しい依存は追加していない（`package.json`、`pnpm-lock.yaml` に差分なし）

## Build Steps

### 1. Install Dependencies
```bash
cd frontend && pnpm install
cd ../docs-next && npm install
```

### 2. Configure Environment
ビルドには追加の設定は要らない。画面を動かす場合のみ `cp frontend/.env.local.example frontend/.env.local` と `bash scripts/provision-cognito.sh` が必要（[CLAUDE.md](../../../../../CLAUDE.md) のセットアップ手順）。

### 3. Build All Units
```bash
cd frontend && pnpm build
cd ../docs-next && npm run build
```

### 4. Verify Build Success
- **Expected Output**: frontend は `Compiled successfully`。`/resources/[id]` と `/reservations/new` が動的ルート（`ƒ`）として並ぶ。docs-next は `[SUCCESS] Generated static files in "build"`
- **Build Artifacts**: `frontend/.next/`、`docs-next/build/`
- **既存の警告**: docs-next の SVG 画像（`api-spec-dashboard.drawio.svg` など）の読み取り警告は既存で、今回の変更とは無関係

## Backend が変更されていないことの確認
```bash
git diff --stat -- backend
git diff --stat -- frontend/src/server frontend/src/lib
```
- **Expected**: どちらも出力なし（`getAvailabilityAction` と `AvailabilitySlotSchema` も無変更）

## Troubleshooting

### `pnpm build` が型エラーで失敗する
- `npx tsc --noEmit` で場所を特定する。`searchParams` の型（`Promise<Record<string, string | string[] | undefined>>`）が Next.js 15 の期待と合っているかを確認する

### docs-next のビルドがリンク・アンカー破損で失敗する
- `screen-spec.md` に追加した明示 ID（`{#resource-detail}`、`{#availability-calendar}`）と、本文内のリンク `#availability-calendar` が一致しているかを確認する
