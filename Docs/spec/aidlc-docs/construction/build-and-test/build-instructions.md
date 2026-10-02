# Build Instructions

## Prerequisites
- **Build Tool**: Gradle wrapper（backend、Java 25）/ pnpm（frontend、Node 24）
- **Dependencies**: backend は Gradle が取得。frontend は `pnpm install`
- **Environment Variables**: frontend のビルドは `frontend/.env.local`（`cp frontend/.env.local.example frontend/.env.local`）。backend のテストは不要（H2 を使う）
- **System Requirements**: DevContainer 上での実行を想定

## Build Steps

### 1. Install Dependencies
```bash
cd frontend && pnpm install
```

### 2. Build All Units
```bash
cd backend && ./gradlew clean build      # コンパイル、Spotless、Checkstyle、テストを含む
cd frontend && pnpm build                # Next.js プロダクションビルド
cd docs-next && npm run build            # 仕様書のリンク・アンカー検証
```

### 3. Verify Build Success
- **Expected Output**: 各コマンドが終了コード 0。backend は `BUILD SUCCESSFUL`
- **Build Artifacts**: `backend/build/`、`frontend/.next/`、`docs-next/build/`
- **Common Warnings**: backend の Checkstyle `MethodNameCheck`（テスト名のアンダースコア。ADR-018 の命名規約による既存の警告）。`docs-next` の SVG 画像の読み取り警告（既存）

## Troubleshooting

### Build Fails with Formatting Errors
- **Cause**: Spotless / oxfmt の整形差分
- **Solution**: `./gradlew spotlessApply`、`pnpm format` を実行して再ビルド

### Build Fails with Compilation Errors
- **Cause**: `ResourceService.list` のシグネチャ違い（旧 5 引数と新 6 引数のオーバーロード）の呼び出し誤り
- **Solution**: 呼び出し側の引数順 `(category, keyword, from, to, isAdmin, pageable)` を確認する
