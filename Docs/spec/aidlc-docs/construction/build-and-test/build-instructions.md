# Build Instructions: csv-export

## Prerequisites

- **Build Tool**: Gradle（Kotlin DSL、Gradle Wrapper 同梱）/ pnpm（フロントエンド）
- **Dependencies**: 追加された `com.opencsv:opencsv:5.12.0`（バックエンド）。フロントエンドの新規依存はゼロ
- **Environment Variables**: 既存の `frontend/.env.local`（`BACKEND_URL` 等）。本タスクで新規の環境変数は追加していない
- **System Requirements**: Java 25（toolchain 指定済み）、Node.js（`frontend/package.json` の engines 準拠）

## Build Steps

### 1. 依存関係の解決

```bash
cd backend && ./gradlew --refresh-dependencies compileJava
cd frontend && pnpm install --frozen-lockfile
```

### 2. バックエンドのビルド

```bash
cd backend && ./gradlew build -x test
```

### 3. フロントエンドのビルド

```bash
cd frontend && pnpm build
```

### 4. ビルド成功の確認

- **期待される出力**：`next build` が `Route (app)` の一覧に `/admin/reports`（Dynamic）と `/api/reports/reservations/csv`（Dynamic）を含めて表示する
- **ビルド成果物**：`backend/build/libs/*.jar`、`frontend/.next/`
- **許容される警告**：`checkstyleMain` の `MethodName` 警告2件（`ReservationRepository` の既存メソッド `findByResource_IdAndStatusIn` 等。本タスク以前からの既存コードであり対象外）

## Troubleshooting

### opencsv の依存解決に失敗する

- **原因**：Maven Central への到達性の問題、またはバージョン `5.12.0` が到達できない環境
- **解決**：`./gradlew dependencies --configuration runtimeClasspath` で `com.opencsv:opencsv` の解決状況を確認する

### `next build` で `/admin/reports` が Dynamic にならない

- **原因**：Route Handler の `export const dynamic = "force-dynamic"` が外れている、または `getAccessToken()` の cookie 依存が失われている
- **解決**：`frontend/src/app/api/reports/reservations/csv/route.ts` の先頭に `export const dynamic = "force-dynamic";` があることを確認する
