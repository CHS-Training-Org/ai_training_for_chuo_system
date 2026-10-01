---
type: working-doc
title: Unit Test Execution（Build and Test）
description: AI-DLC Build and Test ステージのユニットテスト実行手順
timestamp: 2026-10-01
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
cd backend && ./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"
cd frontend && pnpm test resources resource-filter-form
```

### 2. Review Test Results

- **Expected**: backend 134件・frontend 88件、いずれも failures=0
- **Test Coverage**: 本ユニットの新規ロジック（`toLikePattern`・`search()` JPQL・`buildResourceFilterParams`）はすべてユニットテストでカバー
- **Test Report Location**: `backend/build/test-results/test/`（JUnit XML）、`backend/build/reports/tests/test/index.html`（HTML）。frontend は `vitest run` のコンソール出力（HTMLレポート設定なし）

### 3. Fix Failing Tests

失敗した場合：
1. `backend/build/reports/tests/test/index.html` またはコンソール出力でスタックトレースを確認する
2. 失敗したテストケースを特定する
3. `Docs/spec/aidlc-docs/construction/resource-list-filter/functional-design/business-rules.md` の業務ルールと実装の差分を確認する
4. 修正後に再実行する
