# Unit Test Execution — reservation-draft

> 本リポジトリは `backend`/`frontend` 共通の独立した Integration Test 層を持たない。backend の `*ControllerTest` は H2 実データに対する MockMvc 結合テストだが、既存の `./gradlew test` 単一コマンドで実行される（カテゴリ分割なし）ため、本ユニットテスト実行手順にまとめて記載する。

## Backend

### 1. 全テスト実行

```bash
cd backend
./gradlew test
```

### 2. 個別クラスのみ実行する場合（本ユニットの変更分）

```bash
./gradlew test --tests "*ReservationServiceTest" --tests "*ReservationControllerTest"
```

### 3. テスト結果

- **期待値**: 全テスト成功、0 failure / 0 error
- **実測値（本セッション）**: 全 208 テスト成功（既存188件 + 本ユニットの新規追加分：`ReservationServiceTest` 11件・`ReservationControllerTest` 9件）
- **自己検証（break-and-verify）**: `create()`のapproval_steps生成条件・`checkReadAccess()`のDRAFT/APPROVER除外条件・`update()`のsubmit分岐条件を一時的に無効化し、対象テストのみが red になることを確認済み（詳細は `construction/reservation-draft/code/backend-summary.md` 参照）

## Frontend（ユニット・コンポーネントテスト）

### 1. 全テスト実行

```bash
cd frontend
pnpm test
```

### 2. 個別ファイルのみ実行する場合（本ユニットの新規追加分）

```bash
pnpm vitest run tests/unit/reservation-form.test.tsx
pnpm vitest run tests/unit/server/actions/reservations.test.ts
pnpm vitest run tests/unit/reservation-edit-form.test.tsx
pnpm vitest run tests/unit/reservation-detail-page.test.tsx
```

### 3. テスト結果

- **期待値**: 全テスト成功
- **実測値（本セッション）**: 20 ファイル・全 150 テスト成功（既存137件 + 本ユニットの新規追加分：`reservation-form.test.tsx` 2件・`server/actions/reservations.test.ts` 3件・`reservation-edit-form.test.tsx`〔新規ファイル〕4件・`reservation-detail-page.test.tsx`〔新規ファイル〕4件）
- **自己検証（break-and-verify）**: 下書き保存ボタンの`draft`値・正式申請ボタンの表示条件・`canEdit`のDRAFT条件を一時的に無効化し、対象テストのみが red になることを確認済み（詳細は `construction/reservation-draft/code/frontend-summary.md` 参照）

## Frontend（E2E テスト、回帰確認）

本ユニットは `reservations/new/`・`reservations/page.tsx`・`reservations/[id]/page.tsx`・`reservations/[id]/edit/` 配下を改修しているため、既存の E2E スイート（e2e-test-coverage ユニットで追加）への回帰がないことを確認する。本ユニットのスコープとして下書きシナリオの新規 E2E 追加は行わない。

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

- **実測値（本セッション）**: いずれも差分なし。Checkstyle は警告214件検出（すべて本ユニットより前から存在する `MethodName` パターン既知 WARN。severity=warning のためビルド非失敗）
