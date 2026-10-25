# Build Instructions

対象: Issue #29 CSV 帳票出力（`csv-export`）。
本書は `CLAUDE.md` に記載のコマンドと、CI（`.github/workflows/ci-backend.yml` / `ci-frontend.yml`）の検証手順をまとめたもの。実行結果は `build-and-test-summary.md` を参照。

## Prerequisites

- **Build Tool**:
  - Frontend: pnpm（Next.js 15 / React 19 / TypeScript）
  - Backend: Gradle wrapper（`./gradlew`、Kotlin DSL）/ Java 25 / Spring Boot 4.0
- **Dependencies**: 今回の変更で依存は追加していない（`build.gradle.kts`・`package.json` は未変更）。Frontend は `frontend/` の `pnpm install`、Backend は Gradle が解決する。
- **Environment Variables**: Frontend は `frontend/.env.local`（`cp frontend/.env.local.example frontend/.env.local`）。Cognito 関連の値は `scripts/provision-cognito.sh` の出力を記入する。今回の検証コマンド（test / lint / format:check / build）は、devcontainer 内の既存の `.env.local` で実行した。
- **System Requirements**: 今回の検証は devcontainer（Linux、Java 25、Node 24、pnpm）で実施した。メモリ・ディスクの要件は確認していない。

Backend のテストは H2 を使うため、PostgreSQL は不要。

## Build Steps

### 1. Install Dependencies

```bash
cd frontend && pnpm install
```

Backend は Gradle wrapper が初回実行時に依存を取得する。今回の検証では、依存は導入済みのため再実行していない。

### 2. Configure Environment

```bash
cp frontend/.env.local.example frontend/.env.local
```

### 3. Build / Compile

```bash
# Backend: コンパイルは test タスクに含まれる
cd backend && ./gradlew test

# Frontend: プロダクションビルド（CI の Build ステップ）
cd frontend && pnpm build
```

CI の検証順（参考）:

- Backend: `./gradlew test` → `./gradlew spotlessCheck` → `./gradlew checkstyleMain`
- Frontend: `pnpm lint` → `pnpm format:check` → `pnpm build` → `pnpm test`

### 4. Verify Build Success

- **Expected Output**:
  - Backend: `./gradlew test` が `BUILD SUCCESSFUL`、全件 pass。
  - Frontend: `pnpm build` が終了コード 0 で、`/reservations` を含む全ルートが生成される。
- **Build Artifacts**: Frontend は `frontend/.next/`（`.gitignore` 対象）。Backend のテストレポートは `backend/build/reports/tests/test/`、結果 XML は `backend/build/test-results/test/`、Checkstyle のレポートは `backend/build/reports/checkstyle/`。
- **Common Warnings**:
  - `checkstyleMain`: `ReservationRepository.java` の既存メソッド名（`findByResource_IdAndStatusIn`、`findByResource_IdInAndStatusIn`）に関する警告 2 件。今回の変更前から存在する。

## Troubleshooting

### `pnpm build` が `next/font` で失敗する
- **Cause**: 前ワークフロー（#23）では、ユーザーの報告で `next/font` による失敗があった（原因は未調査）。今回（#29）は同じ環境で成功しており、再現しなかった。
- **Solution**: 再発した場合は、ログに Google Fonts の取得失敗（ネットワーク）が出ていないかを確認する。

### Backend のテストで依存の取得に失敗する
- **Cause**: ネットワーク、またはキャッシュ不足。
- **Solution**: ネットワーク接続を確認して再実行する。`--offline` は、キャッシュ済みの場合のみ使える。
