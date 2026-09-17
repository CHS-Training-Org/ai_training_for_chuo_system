# Build Instructions — reservation-draft（Issue #30）

## Prerequisites

- **Build Tool**: Gradle wrapper 9.5.1（backend）／ pnpm 11.20.0（frontend）
- **Dependencies**: `backend/build.gradle.kts`・`frontend/package.json` に既存定義済み（今回の変更で新規依存追加はない）
- **Environment Variables**: 変更なし（`frontend/.env.local` 等、既存の DevContainer 環境をそのまま使用）
- **System Requirements**: Java 25（toolchain）、Node 24（DevContainer 定義済み）。frontend の本ビルド（`pnpm build`）は `next/font/google` の取得のため外部ネットワーク（Google Fonts）への疎通が必要（下記トラブルシューティング参照）

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
cd backend && ./gradlew clean build   # コンパイル + テスト + Spotless/Checkstyle

# frontend
cd frontend && pnpm build
```

### 4. Verify Build Success

- **Expected Output**: backend は `BUILD SUCCESSFUL`。frontend は `✓ Compiled successfully` の後、11ルートの静的/動的ページ生成が完了する。
- **Build Artifacts**: backend `build/libs/*.jar`（実行はしていない、コンパイル確認のみ）。frontend `.next/` ディレクトリ。
- **Common Warnings**: frontend ビルド時に、`next/font/google`（Noto Sans JP・Inter）の外部リソース取得を試みるログ（`ECONNREFUSED`／`ETIMEDOUT`／`Retrying`）が出ることがあるが、サンドボックス環境のネットワークが一時的に制限されているためであり、既存挙動でありビルド結果には影響しない（最終的に到達できれば `Compiled successfully` に進む）。

### 実行結果（このセッションで確認済み）

- `cd backend && ./gradlew test spotlessCheck checkstyleMain checkstyleTest` → `BUILD SUCCESSFUL`（157 tests, 0 failures, 0 errors）
- `cd frontend && pnpm lint` → 警告・エラーなし
- `cd frontend && pnpm build` → 初回試行はGoogle Fontsへの接続失敗で完走しなかったが、再試行時（ネットワーク回復後）に `✓ Compiled successfully in 10.9min` のあと全11ルートの静的ページ生成・ビルドトレース収集まで完走（exit 0）

## Troubleshooting

### Build Fails with Dependency Errors

- **Cause**: 今回の変更は既存依存関係のみを使用しており、新規追加はない。依存関係エラーが出た場合は今回の変更に起因しない可能性が高い。
- **Solution**: `git diff` で変更ファイルを確認し、`build.gradle.kts`／`package.json` に変更がないことを確認する。

### Build Fails with Compilation Errors

- **Cause**: `CreateReservationRequest`/`UpdateReservationRequest`（Java record）にフィールド（`draft`/`submit`）を追加したため、既存の呼び出し箇所（特にテストのコンストラクタ呼び出し）が引数不足で失敗する可能性がある。
- **Solution**: `grep -rn "new CreateReservationRequest(\|new UpdateReservationRequest(" backend/src` で全呼び出し箇所を洗い出し、末尾に `draft`/`submit`（`Boolean`、null可）の引数が揃っているか確認する。

### frontend の `pnpm build` が Google Fonts 取得失敗で完走しない

- **Cause**: `src/app/layout.tsx` の `next/font/google`（Inter・Noto Sans JP）がビルド時に Google Fonts へ接続する。サンドボックス環境で外部ネットワークが一時的に制限されていると `ECONNREFUSED`/`ETIMEDOUT` のリトライを繰り返す。
- **Solution**: ネットワークが回復すれば数分のリトライの後に自動的に成功する（このセッションでも再試行で成功を確認済み）。恒久的に接続できない環境では `node_modules/.bin/tsc --noEmit`・`pnpm lint`・`pnpm test` を代替の検証手段とし、フルビルドはネットワークに余裕のある環境（CI 等）で最終確認する。
