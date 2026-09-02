---
type: spec
title: Unit Test Execution - resource-keyword-filter
description: AI-DLC Build and Test ステージの成果物。resource-list-filter エンハンス課題のユニットテスト実行手順
tags:
  - ai-dlc
  - build-and-test
  - resource
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../plans/resource-keyword-filter-code-generation-plan.md
---

# Unit Test Execution - resource-keyword-filter

## バックエンド：ユニットテスト（Mockito）

```bash
cd backend
./gradlew test --tests "*ResourceServiceTest"
```

- **対象**: `ResourceServiceTest`（`List_` ネストクラス）
- **確認済み結果**: 既存4テスト＋新規1テスト（`list_blankKeyword_normalizesToNullBeforeSearch`）すべて pass
- **テストレポート**: `backend/build/reports/tests/test/index.html`

## バックエンド：コントローラ統合テスト（H2 実DB）

```bash
cd backend
./gradlew test --tests "*ResourceControllerTest"
```

- **対象**: `ResourceControllerTest`（keyword 関連6テストを含む全テスト）
- **確認済み結果**: すべて pass
- **テストレポート**: `backend/build/reports/tests/test/index.html`

## バックエンド：全体テスト・静的解析

```bash
cd backend
./gradlew test checkstyleMain checkstyleTest
./gradlew spotlessApply   # フォーマット適用（コード生成時に実施済み）
```

- **確認済み結果**: `BUILD SUCCESSFUL`（checkstyle の `MethodName` 警告は既存事象。build-instructions.md のトラブルシューティング参照）

## フロントエンド：ユニットテスト（Vitest）

```bash
cd frontend
pnpm test
```

- **確認済み結果**: 10 ファイル・81 テストすべて pass（`resources.test.ts` の新規1テスト含む）
- **対象**: `tests/unit/server/actions/resources.test.ts` の `listResourcesAction` describe ブロック

## フロントエンド：Lint・フォーマット

```bash
cd frontend
pnpm lint
pnpm format:check
```

- **確認済み結果**: いずれも違反なし

## テストが失敗した場合

1. `backend/build/reports/tests/test/index.html`（バックエンド）または Vitest のコンソール出力（フロントエンド）で失敗したテストケースを確認する
2. `Docs/spec/aidlc-docs/construction/resource-keyword-filter/functional-design/business-rules.md`（BR-01〜06）と実装の対応を見直す
3. 修正後、該当テストのみ再実行してから全体テストを再実行する
