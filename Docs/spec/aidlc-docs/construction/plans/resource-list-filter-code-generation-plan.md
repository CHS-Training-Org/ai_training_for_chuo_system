---
type: spec
title: Code Generation Plan（resource-list-filter）
description: リソース一覧キーワード検索のコード生成計画（Part 1: Planning）
tags:
  - ai-dlc
  - code-generation
timestamp: 2026-07-19
references:
  - Docs/spec/aidlc-docs/construction/resource-list-filter/functional-design
  - Docs/spec/enhancements/resource-list-filter.md
---

# Code Generation Plan — resource-list-filter

## Unit Context

- **Unit**: `resource-list-filter`（単一ユニット、Units Generation はSKIP。[execution-plan.md](../../inception/plans/execution-plan.md) 参照）
- **要件トレース**: RES-01〜04（[requirements.md](../../inception/requirements/requirements.md)）
- **設計決定**: `ResourceRepository` は `JpaSpecificationExecutor` + `Specification` へ移行（[business-logic-model.md](../resource-list-filter/functional-design/business-logic-model.md)）
- **依存**: なし（他ユニットへの依存・被依存なし）
- **DBスキーマ変更**: なし（マイグレーション不要）

## 実行ステップ

- [x] **Step 1: Spec Update** — `Docs/spec/api-spec.md` §`GET /api/resources` と `Docs/spec/screen-spec.md` §`/resources` に `keyword` を追記する（Spec-first原則）
- [x] **Step 2: Repository Layer Generation** — `ResourceRepository` に `JpaSpecificationExecutor<Resource>` を追加し、既存の派生クエリメソッド（`findByCategory`, `findByCategoryAndIsActiveTrue`, `findByIsActiveTrue`, `findAll` の呼び出し）を `Specification` ベースの呼び出しに置き換える。`ResourceSpecifications`（category/isActive/keyword の各条件 Specification）を新規作成する
- [x] **Step 3: Business Logic Generation** — `ResourceService.list()`/`listPaginated()`/`fetchAllCandidates()` に `keyword` パラメータを追加し、`ResourceSpecifications` を合成して呼び出す
- [x] **Step 4: Business Logic Unit Testing** — `ResourceServiceTest` に keyword 関連のテストケースを追加（name一致・description一致・大文字小文字無視・category/from-to との組み合わせ・空文字で条件解除）
- [x] **Step 5: API Layer Generation** — `ResourceController.list()` に `keyword` の `@RequestParam(required = false)` を追加し `ResourceService.list()` に渡す
- [x] **Step 6: API Layer Unit Testing** — `ResourceControllerTest` に `keyword` パラメータのテストケースを追加
- [x] **Step 7: Frontend Components Generation** — `ResourceFilterForm`（keyword入力欄・`defaultKeyword` props）、`page.tsx`（`SearchParams.keyword` 追加）、`resources.ts`（`ListResourcesParams.keyword` 追加）を変更
- [x] **Step 8: Frontend Unit Testing** — `frontend/tests/unit/server/actions/resources.test.ts` に `keyword` パラメータを渡すテストケースを追加（既存テストパターンに追記。`ResourceFilterForm` 自体のレンダリングテストは既存リポジトリに前例がなく本スコープでは追加しない）
- [x] **Step 9: Documentation Generation** — 本ユニットの実装サマリーを `Docs/spec/aidlc-docs/construction/resource-list-filter/code/summary.md` に記録

## Story Traceability

| ステップ | 対応要件 |
|---|---|
| Step 1 | RES-01（spec整合） |
| Step 2, 3 | RES-01, RES-02, RES-04 |
| Step 4 | 受入条件（バックエンドユニットテスト追加） |
| Step 5 | RES-01 |
| Step 6 | 受入条件（既存テスト継続pass・新規テスト追加） |
| Step 7 | RES-03 |
| Step 8 | 受入条件 |
| Step 9 | — |

## 対象外（Deployment Artifacts 等）

- データベースマイグレーション：不要（新規カラムなし）
- デプロイ関連の変更：不要（インフラ変更なし、[execution-plan.md](../../inception/plans/execution-plan.md) Infrastructure Design SKIP と整合）
