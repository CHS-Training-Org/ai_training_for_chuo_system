# Build Instructions — e2e-test-coverage

## 前提

- **Build Tool**: Gradle Wrapper（backend）/ pnpm（frontend）
- **依存関係**: 既存の `backend/build.gradle.kts` / `frontend/package.json` から追加・変更なし（本ユニットは既存の `@playwright/test` 設定のみで実装、新規依存追加なし）
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

## E2E テスト実行（本ユニットの主眼）

```bash
cd frontend
pnpm test:e2e
```

- **前提**: backend（`./gradlew bootRun`）・frontend（`pnpm dev`、`pnpm test:e2e` が `webServer` 設定により自動起動）・PostgreSQL・cognito-local が揃っていること
- **期待される結果**: 全8テスト（`example.spec.ts` 1件 + 新規 `auth.spec.ts`/`resources.spec.ts`/`reservation-flow.spec.ts`/`approval.spec.ts` 計7件）が成功

## トラブルシューティング

- **Checkstyle 警告（`MethodName` パターン不一致、計9ファイル194件）**：`ADR-018` のテスト命名規約（`methodName_condition_expectedBehavior`、アンダースコア区切り）に起因する既存の既知 WARN であり、本ユニットより前から存在する。severity=warning のためビルド失敗の原因ではない
- **Playwright の `workers` 設定**：学習者のPCによってはメモリが少なく、デフォルトの並列実行（マルチワーカー）が不安定になることがあるため、本ユニットで `playwright.config.ts` の `workers` を環境を問わず常に `1` に固定した
- **Vitest の並列実行も同様にメモリ制約を受けることが判明**：本ユニットの検証中、`pnpm test`（デフォルトの Vitest マルチスレッド実行）がこのサンドボックス環境ではワーカーのタイムアウトで不安定になることを確認したため、`vitest.config.ts` に `poolOptions.forks.{max,min}Forks: 1` を追加し、テスト分離（`isolate`）は維持したまま並列度のみ1に絞った（Playwright の `workers:1` と同じ方針。Vitest 3 のデフォルト pool は `"forks"` のため `poolOptions.forks` を設定する。`poolOptions.threads` は無視され効かないので注意）
- **予約の日時衝突・ページング**：E2E テストの日時固定値が狭い範囲だと、繰り返し実行で同一リソース・同一時間帯の予約が蓄積し重複エラーになることがある。本ユニットでは基準日に1年分のランダムな揺らぎを加え、かつ `reservation-flow.spec.ts` では期間フィルタで絞り込んでから検証することで対処した（詳細は `construction/e2e-test-coverage/code/frontend-summary.md` 参照）。ただしランダム化は衝突確率を下げるのみで、テスト用DBには実行のたびに `approval.spec.ts`・`reservation-flow.spec.ts` が作成した予約データが蓄積し続ける。長期間 E2E テストを繰り返し実行した結果、同一スロットの衝突や `/reservations` 一覧の肥大化が気になってきた場合は、以下の手順でテスト用DBをリセットする（ローカル開発用の使い捨てDBであることが前提。本番・共有環境では実行しないこと）：
  ```bash
  # postgres コンテナ名は環境により異なる（docker ps で確認）
  docker exec -i <postgres-container> psql -U bookflow -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bookflow';"
  docker exec -i <postgres-container> psql -U bookflow -d postgres -c "DROP DATABASE IF EXISTS bookflow;"
  docker exec -i <postgres-container> psql -U bookflow -d postgres -c "CREATE DATABASE bookflow OWNER bookflow;"
  # backend を再起動して Flyway マイグレーションを再適用した後
  docker exec -i <postgres-container> psql -U bookflow -d bookflow < scripts/seed.sql
  ```
