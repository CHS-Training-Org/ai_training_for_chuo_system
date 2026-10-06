# Unit Test Execution — e2e-test-coverage

> 本リポジトリは `backend`/`frontend` 共通の独立した Integration Test 層を持たない。backend の `*ControllerTest` は H2 実データに対する MockMvc 結合テストだが、既存の `./gradlew test` 単一コマンドで実行される（カテゴリ分割なし）ため、本ユニットテスト実行手順にまとめて記載する。本ユニットは E2E テストが主眼のため、E2E 実行手順も本ファイルに記載する。

## Backend

### 1. 全テスト実行

```bash
cd backend
./gradlew test
```

### 2. テスト結果

- **期待値**: 全テスト成功、0 failure / 0 error
- **実測値（本セッション）**: 全 188 テスト成功（本ユニットは backend のコード変更を含まないため件数は従来のまま）

## Frontend（ユニット・コンポーネントテスト）

### 1. 全テスト実行

```bash
cd frontend
pnpm test
```

### 2. テスト結果

- **期待値**: 全テスト成功
- **実測値（本セッション）**: 15 ファイル・全 121 テスト成功（本ユニットは frontend のユニットテストを追加していないため件数は従来のまま）
- **メモ**: `vitest.config.ts` に `poolOptions.forks.{max,min}Forks: 1` を追加済み（低メモリ環境での安定化、`build-instructions.md` のトラブルシューティング参照）

## Frontend（E2E テスト、本ユニットの追加分）

### 1. 全テスト実行

```bash
cd frontend
pnpm test:e2e
```

### 2. 個別ファイルのみ実行する場合

```bash
pnpm exec playwright test tests/e2e/auth.spec.ts
pnpm exec playwright test tests/e2e/resources.spec.ts
pnpm exec playwright test tests/e2e/reservation-flow.spec.ts
pnpm exec playwright test tests/e2e/approval.spec.ts
```

### 3. テスト結果

- **期待値**: 全8テスト成功（既存 `example.spec.ts` 1件 + 新規4ファイル7件）
- **実測値（本セッション）**: `workers: 1` 固定のもとで連続3回実行し、いずれも 8/8 pass
- **自己検証（break-and-verify）**: `auth.spec.ts` のサインアウト確認（`context.clearCookies()` を一時無効化）、`approval.spec.ts` の承認確認（確認ボタンクリックを一時無効化）の2点について、対象コードを無効化すると red になることを確認済み（詳細は `construction/e2e-test-coverage/code/frontend-summary.md` 参照）

## Lint・フォーマット

```bash
# backend
cd backend && ./gradlew spotlessApply checkstyleMain

# frontend
cd frontend && pnpm lint && pnpm format:check
```

- **実測値（本セッション）**: いずれも差分なし。Checkstyle は警告194件検出（すべて本ユニットより前から存在する `MethodName` パターン既知 WARN。severity=warning のためビルド非失敗）
