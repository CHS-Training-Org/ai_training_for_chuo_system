---
type: working-doc
title: Unit Test Execution（Build and Test）
description: AI-DLC Build and Test ステージのユニットテスト実行手順（ユニット reservation-draft）
timestamp: 2026-11-14
---

# Unit Test Execution

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
cd backend && ./gradlew test
cd frontend && pnpm test
```

対象ユニットのみに絞る場合：

```bash
cd backend && ./gradlew test --tests "*ReservationServiceTest" --tests "*ReservationControllerTest"
cd frontend && pnpm test reservations reservation-permissions
```

### 2. Review Test Results

- **Expected**: backend 194 件・frontend 114 件、いずれも failures=0
- **Test Coverage**: 本ユニットの新規ロジック（下書きの作成・更新・正式申請・削除、下書きの閲覧権限、一覧の `DRAFT` 除外、`getReservationActions`）はすべてユニットテストでカバー
- **Test Report Location**: `backend/build/test-results/test/`（JUnit XML）、`backend/build/reports/tests/test/index.html`（HTML）。frontend は `vitest run` のコンソール出力（HTML レポート設定なし）

### 3. Fix Failing Tests

失敗した場合：

1. `backend/build/reports/tests/test/index.html` またはコンソール出力でスタックトレースを確認する
2. 失敗したテストケースを特定する
3. `Docs/spec/aidlc-docs/construction/reservation-draft/functional-design/business-rules.md` の業務ルール（BR-D1〜D6）と実装の差分を確認する
4. 修正後に再実行する
