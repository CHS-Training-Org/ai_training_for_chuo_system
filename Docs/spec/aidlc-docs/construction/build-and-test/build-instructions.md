# Build Instructions（csv-export）

## Prerequisites
- **Build Tool**: Gradle wrapper（backend、Java 25）、pnpm（frontend）、npm（docs-next）
- **Environment Variables**: frontend は `frontend/.env.local`（`.env.local.example` をコピー）。ビルド確認だけなら不要
- **Services**: BE の自動テストは H2 を使うため DB 不要。手動確認のみ PostgreSQL が必要

## Build Steps
### 1. Backend
```bash
cd backend
./gradlew spotlessApply     # フォーマット適用
./gradlew clean build       # spotlessCheck、checkstyle、test を含む
```
### 2. Frontend
```bash
cd frontend
pnpm install
pnpm lint && pnpm format:check
pnpm exec tsc --noEmit
pnpm build
```
### 3. Docs
```bash
cd docs-next
npm run build               # リンクとアンカーの破損があれば失敗する
```

## Verify Build Success
- 3 つとも成功する。
- **Common Warnings**: Checkstyle の警告（main 2 件、test 192 件）は warning 止まりでビルドは通る。docs の drawio SVG 読み取り警告は既存。

## Troubleshooting
- `spotlessCheck` で失敗: `./gradlew spotlessApply` を実行して再ビルドする。
- `format:check` で失敗: `pnpm format` を実行する。
