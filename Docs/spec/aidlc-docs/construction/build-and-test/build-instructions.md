# Build Instructions — csv-export

## Prerequisites

- **Build Tool**: Gradle Wrapper（backend） / pnpm（frontend） / npm（docs-next）
- **Dependencies**: `CLAUDE.md`「よく使うコマンド」参照。DevContainer 使用時は自動解決。**依存ライブラリは追加していない**（`build.gradle.kts` / `package.json` は未変更）
- **Environment Variables**:
  - backend: `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`（既定は `.devcontainer/docker-compose.yml` の `postgres`）、`COGNITO_JWKS_URI`
  - frontend: `frontend/.env.local`（`BACKEND_URL` を Route Handler が使う。未設定時は `http://localhost:8080`）
- **System Requirements**: Java 25（Gradle toolchain が自動解決）、Node.js 24

## Build Steps

### 1. Install Dependencies

```bash
cd frontend && pnpm install
```

### 2. Configure Environment

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
```

### 3. Build All Units

```bash
cd backend && ./gradlew build        # テスト・spotlessCheck・checkstyle を含む
cd frontend && pnpm build
cd docs-next && npm run build        # 仕様書のリンク・アンカー検証
```

### 4. Verify Build Success

- **Expected Output**: `BUILD SUCCESSFUL` / Next.js のビルド成功。`pnpm build` のルート一覧に `ƒ /admin/reports` と `ƒ /api/reports/reservations/csv` が出る
- **Build Artifacts**: `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`、`frontend/.next/`、`docs-next/build/`
- **Common Warnings**:
  - Checkstyle `MethodName`（テストメソッド名のアンダースコア。ADR-018 の命名規約による既存の警告）
  - `docs-next` の `drawio.svg` の画像サイズ取得警告（既存。今回の変更とは無関係）

## Troubleshooting

### `./gradlew test` で `ReportControllerTest` が失敗する

- **Cause**: 結合テストは H2 のインメモリ DB を共有する。他のテストが同じ ID のデータを残すと衝突する
- **Solution**: `ReportControllerTest` は `2000...` 系の固定 ID と 2090 年台の日時を使い、`@AfterEach` で削除している。新しい結合テストを足すときは、ID と日時が既存と重ならないようにする

### 開発サーバーを止めるときに自分のシェルまで落ちる

- **Cause**: `kill` の対象を `cmdline` の部分一致で選ぶと、そのコマンド文字列自体を持つシェルも一致する
- **Solution**: PID を先に特定し、`comm`（`java` / `node`）で絞ってから個別に止める
