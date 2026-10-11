# Unit Test Execution — calendar-view

> 本リポジトリは `backend`/`frontend` 共通の独立した Integration Test 層を持たない。backend の `*ControllerTest` は H2 実データに対する MockMvc 結合テストだが、既存の `./gradlew test` 単一コマンドで実行される（カテゴリ分割なし）ため、本ユニットテスト実行手順にまとめて記載する。

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

### 2. 個別ファイルのみ実行する場合（本ユニットの新規追加分）

```bash
pnpm vitest run tests/unit/availability-calendar.test.tsx
pnpm vitest run tests/unit/reservation-form.test.tsx
pnpm vitest run tests/unit/resource-detail-page.test.tsx
```

### 3. テスト結果

- **期待値**: 全テスト成功
- **実測値（本セッション）**: 17 ファイル・全 132 テスト成功（既存121件 + 本ユニットの新規追加分：`availability-calendar.test.tsx` 8件・`reservation-form.test.tsx` 2件、既存 `resource-detail-page.test.tsx` の更新分1件増）
- **自己検証（break-and-verify）**: `AvailabilityCalendar.tsx` の占有判定ロジック（`isOverlapping`）を一時的に無効化し、週表示・月表示の占有判定テスト2件が red になることを確認済み（詳細は `construction/calendar-view/code/frontend-summary.md` 参照）

## Frontend（E2E テスト、回帰確認）

本ユニットは `resources/[id]/page.tsx`・`reservations/new/` 配下を改修しているため、既存の E2E スイート（e2e-test-coverage ユニットで追加）への回帰がないことを確認する。

```bash
cd frontend
pnpm test:e2e
```

- **期待値**: 全8テスト成功
- **実測値（本セッション）**: `workers: 1` 固定のもとで 8/8 pass（回帰なし）

## Lint・フォーマット

```bash
# backend
cd backend && ./gradlew spotlessApply checkstyleMain

# frontend
cd frontend && pnpm lint && pnpm format:check
```

- **実測値（本セッション）**: いずれも差分なし。Checkstyle は警告194件検出（すべて本ユニットより前から存在する `MethodName` パターン既知 WARN。severity=warning のためビルド非失敗）
