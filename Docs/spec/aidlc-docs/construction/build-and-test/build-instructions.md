# Build Instructions — resource-list-filter

## Prerequisites

- **Build Tool**: Gradle Wrapper（backend） / pnpm（frontend）
- **Dependencies**: `CLAUDE.md`「よく使うコマンド」参照。DevContainer 使用時は自動解決
- **Environment Variables**:
  - backend: `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`（デフォルトは `.devcontainer/docker-compose.yml` の `postgres` サービス）、`COGNITO_JWKS_URI`
  - frontend: `frontend/.env.local`（`cp frontend/.env.local.example frontend/.env.local` 後に `COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID` を設定）
- **System Requirements**: Java 25（Gradle toolchain が自動解決）、Node.js（pnpm 経由）

## Build Steps

### 1. Install Dependencies

```bash
cd frontend && pnpm install
```

backend は Gradle wrapper が依存関係を自動解決する（追加コマンド不要）。

### 2. Configure Environment

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
```

### 3. Build All Units

```bash
cd backend && ./gradlew build
cd frontend && pnpm build
```

### 4. Verify Build Success

- **Expected Output**: 両コマンドとも `BUILD SUCCESSFUL` / Next.js のビルド成功メッセージ
- **Build Artifacts**: `backend/build/libs/*.jar`、`frontend/.next/`
- **Common Warnings**: `ReservationRepository` の Checkstyle `MethodName` 警告2件（本タスク以前から存在、JPA の `_` 区切りプロパティ参照記法によるもので無害）

## Troubleshooting

### Build Fails with Dependency Errors

- **Cause**: Gradle/pnpm のキャッシュ不整合
- **Solution**: `./gradlew clean build` / `pnpm install --force`

### Build Fails with Compilation Errors

- **Cause**: `ResourceRepository`/`ResourceService`/`ResourceController` 間のメソッドシグネチャ不一致（本タスクでは `list`/`search` の引数順序変更を伴うため）
- **Solution**: `ResourceController.list()` → `ResourceService.list()` → `ResourceRepository.search()` の呼び出しチェーンで引数の型・順序を確認する
