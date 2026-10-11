# Build Instructions — reservation-draft

## 前提

- **Build Tool**: Gradle Wrapper（backend）/ pnpm（frontend）
- **依存関係**: 既存の `backend/build.gradle.kts` / `frontend/package.json` から追加・変更なし
- **環境変数**: 変更なし

## Backend ビルド

```bash
cd backend
./gradlew build
```

- **期待される結果**: `BUILD SUCCESSFUL`
- **含まれる処理**: コンパイル、Spotless/Checkstyle 検証、JUnit テスト実行

## Frontend ビルド

```bash
cd frontend
pnpm build
```

- **期待される結果**: `✓ Compiled successfully`、型チェック・静的ページ生成まで成功し全13ルートが一覧に出力される

## トラブルシューティング

- **Checkstyle 警告（`MethodName` パターン不一致、計9ファイル214件）**：`ADR-018` のテスト命名規約に起因する既存の既知 WARN であり、本ユニットより前から存在する。severity=warning のためビルド失敗の原因ではない
- **Playwright/Vitest の `workers`/`poolOptions` 設定**：学習者PCのメモリ制約への対応として、`playwright.config.ts` の `workers: 1`・`vitest.config.ts` の `poolOptions.forks.{max,min}Forks: 1` を e2e-test-coverage ユニット（Issue #26）で設定済み。本ユニットでの変更はない
- **`pnpm dev`（Turbopack）と `pnpm build` の同時実行による `.next` 破損**：開発サーバーを起動したまま `pnpm build` を実行すると `.next/server/pages-manifest.json` 等が ENOENT になることがある。`pkill -f "next dev"` で開発サーバーを停止し、`.next` を削除してから再実行すること（本ユニットの Build and Test 実行時にも発生し、この手順で解消した）
- **DRAFT ステータスのアクセス制御**：DRAFT の予約は本人（requester）と ADMIN のみ閲覧可能。APPROVER は本人の DRAFT 以外にアクセスすると 403 になる（通常の PENDING/APPROVED/REJECTED/CANCELLED では APPROVER は全件閲覧可）。手動確認時はこの違いを踏まえてロール別ログインボタンを使い分けること
- **予約データの蓄積・テスト用DBのリセット手順**：e2e-test-coverage ユニットの記載を参照（本ユニットでは変更なし）
  ```bash
  # postgres コンテナ名は環境により異なる（docker ps で確認）
  docker exec -i <postgres-container> psql -U bookflow -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bookflow';"
  docker exec -i <postgres-container> psql -U bookflow -d postgres -c "DROP DATABASE IF EXISTS bookflow;"
  docker exec -i <postgres-container> psql -U bookflow -d postgres -c "CREATE DATABASE bookflow OWNER bookflow;"
  # backend を再起動して Flyway マイグレーションを再適用した後
  docker exec -i <postgres-container> psql -U bookflow -d bookflow < scripts/seed.sql
  ```
