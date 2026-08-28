---
type: note
title: Unit Test Execution
description: カレンダービュー（Unit：calendar-view）のユニットテスト実行手順・結果
tags:
  - ai-dlc
  - build-and-test
timestamp: 2026-08-20
---

# Unit Test Execution — カレンダービュー（Unit: calendar-view）

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
cd frontend
pnpm test
```

### 2. Review Test Results

- **Expected**: 13ファイル・113件成功、失敗0件（本課題で追加した`calendar-logic.test.ts`22件・`reservation-form.test.tsx`2件を含む）。
- **Test Coverage**: `calendar-logic.ts`の全公開関数（期間算出・週グリッド写像・月次要約・クリック可否判定）を境界値込みで網羅。`ReservationForm`は`defaultStartAt`の初期値反映のみを対象とし、既存の申請・重複エラー処理のフローは変更していないため再検証していない。
- **Test Report Location**: 標準出力（`vitest run`の実行結果）。HTMLレポートは`coverage/`（`vitest.config.ts`のcoverage設定、明示的に`--coverage`指定時のみ生成）。

### 3. 個別実行（本課題の追加テストのみ）

```bash
pnpm test calendar-logic
pnpm test reservation-form
```

### 4. Fix Failing Tests

失敗が発生した場合：
1. `vitest run`の出力で失敗ケース名を確認する。
2. `calendar-logic.test.ts`側の失敗は、`business-logic-model.md`の期間算出・重複判定ロジックとの整合を確認する。
3. `reservation-form.test.tsx`側の失敗は、`@/lib/session`経由のBetter Auth初期化がテスト環境で走っていないか（`vi.mock("@/server/actions/reservations", ...)`が効いているか）を確認する。

## 実行結果（本ステージで確認済み）

- `pnpm test`：13ファイル・113件すべて成功。
- `pnpm lint`（oxlint）：エラー・警告なし。
- `pnpm build`（型チェック兼ねる）：成功。
