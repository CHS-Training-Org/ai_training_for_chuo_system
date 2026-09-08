# Build Instructions — resource-list-filter（Issue #23）

## Prerequisites

- **Build Tool**: Gradle wrapper 9.5.1（backend）／ pnpm 11.5.0（frontend）
- **Dependencies**: `backend/build.gradle.kts`・`frontend/package.json` に既存定義済み（今回の変更で新規依存追加はない）
- **Environment Variables**: 変更なし（`frontend/.env.local` 等、既存の DevContainer 環境をそのまま使用）
- **System Requirements**: Java 25（toolchain）、Node 24（DevContainer 定義済み）

## Build Steps

### 1. Install Dependencies

```bash
# backend（依存関係の変更はないため通常は不要。念のため）
cd backend && ./gradlew dependencies

# frontend（依存関係の変更はないため通常は不要）
cd frontend && pnpm install
```

### 2. Configure Environment

変更なし。既存の DevContainer / `docker-compose.yml`（postgres・cognito-local 等）をそのまま使用する。

### 3. Build All Units

```bash
# backend
cd backend && ./gradlew clean build -x test   # コンパイル + Spotless/Checkstyle
# 実際の検証では ./gradlew build（test含む）を実行した

# frontend
cd frontend && pnpm build
```

### 4. Verify Build Success

- **Expected Output**: backend は `BUILD SUCCESSFUL`。frontend は `✓ Compiled successfully` の後、11ルートの静的/動的ページ生成が完了する。
- **Build Artifacts**: backend `build/libs/*.jar`（実行はしていない、コンパイル確認のみ）。frontend `.next/` ディレクトリ。
- **Common Warnings**: frontend ビルド時に、フォント等の外部リソース取得を試みるログ（`ECONNREFUSED`／`Retrying`）が出ることがあるが、サンドボックス環境でネットワークが制限されているためであり、既存挙動でありビルド結果には影響しない。

### 実行結果（このセッションで確認済み）

- `cd backend && ./gradlew test spotlessCheck checkstyleMain` → `BUILD SUCCESSFUL`
- `cd frontend && pnpm lint` → 警告・エラーなし
- `cd frontend && pnpm build` → `✓ Compiled successfully`、11ルート生成成功

## Troubleshooting

### Build Fails with Dependency Errors

- **Cause**: 今回の変更は既存依存関係のみを使用しており、新規追加はない。依存関係エラーが出た場合は今回の変更に起因しない可能性が高い。
- **Solution**: `git diff` で変更ファイルを確認し、`build.gradle.kts`／`package.json` に変更がないことを確認する。

### Build Fails with Compilation Errors

- **Cause**: `ResourceService.list(...)` のシグネチャ変更（`keyword` 引数追加）により、他の呼び出し箇所が未更新の可能性。
- **Solution**: `grep -rn "resourceService.list(\|resourceService\.list(" backend/src` で全呼び出し箇所を洗い出し、引数の並び（`category, keyword, from, to, isAdmin, pageable`）に揃っているか確認する。
