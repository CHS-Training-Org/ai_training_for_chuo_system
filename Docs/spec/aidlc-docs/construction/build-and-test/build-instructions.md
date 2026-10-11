# Build Instructions

## Prerequisites

- **Build Tool**: Gradle（Kotlin DSL、wrapper 同梱）/ pnpm（Node.js）
- **Dependencies**: `backend/build.gradle.kts`（Spring Boot 4.0 / Java 25）、`frontend/package.json`（Next.js 15 / React 19）
- **Environment Variables**: `frontend/.env.local`（`cp frontend/.env.local.example frontend/.env.local` 済みであること。`COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` は `scripts/provision-cognito.sh` 実行後に記入）
- **System Requirements**: DevContainer（`.devcontainer/docker-compose.yml`）起動済み。PostgreSQL・cognito-local が稼働していること

## Build Steps

### 1. Install Dependencies

```bash
cd frontend && pnpm install
cd backend && ./gradlew dependencies --write-locks
```

### 2. Configure Environment

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
```

バックエンドは本ユニット検証時点で `./gradlew bootRun` により常駐稼働済み（`http://localhost:8080/actuator/health` で確認）。

### 3. Build All Units

```bash
cd backend && ./gradlew clean spotlessApply checkstyleMain test
cd frontend && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

### 4. Verify Build Success

- **Expected Output**: 両コマンドとも `BUILD SUCCESSFUL` / 終了コード 0
- **Build Artifacts**: `backend/build/libs/*.jar`、`frontend/.next/`
- **Common Warnings**: Checkstyle で `Resource.java`（`ParameterNumber`）・`ReservationRepository.java`（`MethodName`）の既存警告4件が出るが、本ユニット（reservation-draft）の変更とは無関係の既存警告であり許容する

## Troubleshooting

### Build Fails with Dependency Errors

- **Cause**: `pnpm install` 未実行、または `.env.local` 未作成
- **Solution**: 「ローカル環境セットアップ（Gotcha）」（`/workspace/CLAUDE.md`）の手順を再実行する

### Build Fails with Compilation Errors

- **Cause**: `CreateReservationRequest` / `UpdateReservationRequest` 等の DTO フィールド名の変更漏れ、または `reservation.ts` スキーマとの型不整合
- **Solution**: `Docs/spec/aidlc-docs/construction/reservation-draft/code/backend-summary.md` ・ `frontend-summary.md` の変更差分を確認する
