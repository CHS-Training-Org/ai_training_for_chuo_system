---
type: spec
title: Unit Test Instructions - resource-keyword-filter
description: リソースキーワード検索機能のユニットテスト実行手順と実績（AI-DLC Build and Test 成果物）
tags:
  - ai-dlc
  - build-and-test
  - resource
  - test
timestamp: 2026-08-17
audience: 学習者・メンター
references:
  - backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java
  - backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java
  - frontend/tests/unit/server/actions/resources.test.ts
---

# Unit Test Instructions - resource-keyword-filter

## バックエンド

```bash
cd backend
./gradlew test
```

- **対象**: 全ユニットテスト（`ResourceServiceTest`／`ResourceControllerTest` を含む）
- **本ステージでの実行結果**: 131件 pass、失敗・エラー0件
- **本ユニット追加分**: `ResourceServiceTest` に2件（`list_withBlankKeyword_normalizesToNullBeforeRepositoryCall`／`list_withKeyword_passesTrimmedKeywordToRepositoryCall`）、`ResourceControllerTest` に6件（keyword による名前一致・説明一致・大文字小文字非区別・非一致・空白正規化・category との AND 条件）
- **テストレポート**: `backend/build/test-results/test/`（XML）、`backend/build/reports/tests/test/index.html`（HTML）

## フロントエンド

```bash
cd frontend
pnpm test
```

- **対象**: 全ユニットテスト
- **本ステージでの実行結果**: 10ファイル・81件 pass、失敗0件
- **本ユニット追加分**: `resources.test.ts` に1件（`listResourcesAction` へ `keyword` パラメータを渡せることの確認）。MSW はクエリパラメータの内容を検証しないため、パラメータが例外なく渡ることの確認に留まる

## テストが失敗した場合

1. `backend/build/reports/tests/test/index.html`（バックエンド）または vitest のコンソール出力（フロントエンド）で失敗テストを特定する
2. 該当する実装ファイル（`ResourceRepository.java`／`ResourceService.java`／`ResourceController.java`／`ResourceFilterForm.tsx` 等）を確認する
3. 修正後、該当テストのみ再実行して確認する
   - バックエンド: `./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"`
   - フロントエンド: `pnpm test resources`
