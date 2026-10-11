# Build Instructions — calendar-view

## 前提

- **Build Tool**: Gradle Wrapper（backend）/ pnpm（frontend）
- **依存関係**: 既存の `backend/build.gradle.kts` / `frontend/package.json` から追加・変更なし（本ユニットは外部カレンダーライブラリ・日付計算ライブラリを導入せず、既存依存のみで実装）
- **環境変数**: 変更なし

## Backend ビルド

本ユニットは backend のコード変更を含まないが、回帰確認のため実行する。

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

- **Checkstyle 警告（`MethodName` パターン不一致、計9ファイル194件）**：`ADR-018` のテスト命名規約に起因する既存の既知 WARN であり、本ユニットより前から存在する。severity=warning のためビルド失敗の原因ではない
- **Playwright/Vitest の `workers`/`poolOptions` 設定**：学習者PCのメモリ制約への対応として、`playwright.config.ts` の `workers: 1`・`vitest.config.ts` の `poolOptions.forks.{max,min}Forks: 1` を e2e-test-coverage ユニット（Issue #26）で設定済み。本ユニットでの変更はない
- **`vi.useFakeTimers()` と RTL の `waitFor`・`userEvent` の非互換**：本ユニットの `availability-calendar.test.tsx` で、fake timers 配下だと RTL の `waitFor`（`setTimeout` ベースのポーリング）や `userEvent.click()` がタイムアウトする事象が発生した。`vi.waitFor`（fake timers 使用時に内部で自動的に時計を進める）と `fireEvent.click()`（同期的でタイマーに依存しない）に置き換えて解決した。同様のパターンで日時依存のコンポーネントテストを書く際は参考にすること（詳細は `construction/calendar-view/code/frontend-summary.md` 参照）
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
