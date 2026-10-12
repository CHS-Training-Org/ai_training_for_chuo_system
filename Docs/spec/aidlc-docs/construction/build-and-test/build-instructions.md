# Build Instructions（csv-report）

## Prerequisites

- **Build Tool**: Gradle 9.5.1（Kotlin DSL、wrapper 同梱）/ pnpm（Node.js）
- **Dependencies**: `backend/build.gradle.kts`（Spring Boot 4.0.6 / Java 25）、`frontend/package.json`（Next.js 15 / React 19）。本ユニットで依存関係の追加はない（OpenCSV 等は導入していない）
- **Environment Variables**: `frontend/.env.local`（`cp frontend/.env.local.example frontend/.env.local` 済みであること）。Route Handler は `BACKEND_URL`（未設定なら `http://localhost:8080`）を使う
- **System Requirements**: ビルドとユニット・結合テストには PostgreSQL も cognito-local も不要（テストは H2）。画面での動作確認（`e2e-test-instructions.md`）には DevContainer の稼働が必要

## Build Steps

### 1. Install Dependencies

```bash
cd frontend && pnpm install
```

### 2. Build All Units（省メモリ・直列で実行する）

```bash
cd backend && ./gradlew clean build --max-workers=1
cd frontend && pnpm lint && pnpm format:check && pnpm test && NODE_OPTIONS=--max-old-space-size=1536 pnpm build
```

`./gradlew build` は `spotlessCheck`・`checkstyleMain`・`test` を含む。整形が必要なときは `./gradlew spotlessApply`、frontend は `pnpm format` を先に実行する。

### 3. Build the Docs Site（spec を更新した場合）

```bash
cd docs-next && NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

リンク・アンカーの破損があれば失敗する。`static/diagrams/**/*.drawio.svg` の「can't be read correctly」警告は既存の画像に対するもので、本ユニットとは無関係。

### 4. Verify Build Success

- **Expected Output**: backend は `BUILD SUCCESSFUL`、frontend は `Compiled successfully` と、ルート一覧に `ƒ /api/reports/reservations/csv` が表示される
- **Build Artifacts**: `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`、`frontend/.next/`
- **Common Warnings**: Checkstyle の警告（`Resource.java` の `ParameterNumber`、`ReservationRepository` の既存メソッド名、テストメソッド名のアンダースコア）は既存コード由来で許容する。本ユニットで追加した本体コードからの警告はない

## Troubleshooting

### Build Fails with Compilation Errors

- **Cause**: `ReservationRepository` の追加メソッドが `PERIOD_MATCH` 定数の宣言より前にある、または `ReportCondition` のフィールドと `ReservationReportService` の参照の不一致
- **Solution**: `Docs/spec/aidlc-docs/construction/csv-report/code/backend-summary.md` と `domain-entities.md` の署名を確認する

### Frontend Build Fails on the Route Handler

- **Cause**: `route.ts` から Next の型に合わない値を返している、または `@/lib/session` の import 解決の失敗
- **Solution**: `Docs/spec/aidlc-docs/construction/csv-report/code/frontend-summary.md` を確認し、`pnpm build` の型エラー出力に従う
