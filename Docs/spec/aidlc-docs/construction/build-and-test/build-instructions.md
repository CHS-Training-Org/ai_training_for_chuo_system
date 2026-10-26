# Build Instructions

## Prerequisites
- **Build Tool**: Gradle wrapper（BE、`backend/gradlew`）、pnpm（FE）
- **Dependencies**: Java 25（BE）、Node.js と pnpm（FE）。依存は初回に各ツールが取得する。
- **Environment Variables**: ビルドと自動テストには不要。FE の動作確認には `frontend/.env.local`（`frontend/.env.local.example` からコピー）が要る。
- **System Requirements**: DevContainer 内での実行を前提とする。
- **本課題での制約**: DevContainer の `docs-next` には docusaurus が入っておらず `npm run build` は失敗するため、docs のビルドはローカルで実行しない。PR の CI（Docs Check / build）で確認する。

## Build Steps

### 1. Install Dependencies
```bash
cd frontend && pnpm install
```
BE の依存は `./gradlew` の実行時に解決される。

### 2. Configure Environment
```bash
cp frontend/.env.local.example frontend/.env.local   # 未作成の場合のみ
```

### 3. Build All Units
```bash
cd backend && ./gradlew clean build      # コンパイル、spotlessCheck、checkstyle、全テスト
cd frontend && pnpm build                # Next.js プロダクションビルド
```
今回の実行では BE に `--offline` を付けた（依存が取得済みのため）。

### 4. Verify Build Success
- **Expected Output**: BE は `BUILD SUCCESSFUL`。FE は `Generating static pages (11/11)` とルート一覧（`/resources` を含む）が出る。
- **Build Artifacts**: BE は `backend/build/`、FE は `frontend/.next/`
- **Common Warnings**: `checkstyleMain` の警告 2 件と `checkstyleTest` の警告 151 件（いずれも既存。`checkstyleMain` の 2 件は `ReservationRepository` のメソッド名 `findByResource_IdAndStatusIn` など）。ビルドは失敗しない。

## Troubleshooting

### Build Fails with Dependency Errors
- **Cause**: 依存が未取得の状態で `--offline` を付けた、またはネットワークに届かない。
- **Solution**: `--offline` を外して再実行する。

### Build Fails with Compilation Errors
- **Cause**: `spotlessCheck` の整形違反、または型エラー。
- **Solution**: BE は `./gradlew spotlessApply`、FE は `pnpm format` を実行してから再ビルドする。FE の型エラーは `pnpm exec tsc --noEmit` で確認する。
