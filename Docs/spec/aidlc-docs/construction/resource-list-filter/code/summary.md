---
type: spec
title: Code Generation Summary（resource-list-filter）
description: リソース一覧キーワード検索の実装サマリー
tags:
  - ai-dlc
  - code-generation
timestamp: 2026-07-19
references:
  - Docs/spec/aidlc-docs/construction/plans/resource-list-filter-code-generation-plan.md
---

# Code Generation Summary — resource-list-filter

## Modified Files

### Backend

- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` — `JpaSpecificationExecutor<Resource>` を追加し、派生クエリメソッド（`findByCategory` 等6メソッド）を削除
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java` — `list()`/`listPaginated()`/`listWithAvailabilityFilter()`/`fetchAllCandidates()` に `keyword` パラメータを追加。`buildSpecification()` を新設し `ResourceSpecifications` を合成
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` — `list()` に `keyword` の `@RequestParam(required = false)` を追加
- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` — 既存4テストを新シグネチャに追従。keyword委譲を確認する2テストを追加
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` — keyword検索用の seed リソース（`KEYWORD_RESOURCE_ID`）を追加。5件の統合テストを追加（name一致・description一致+大文字小文字無視・category とのAND・空文字解除・非一致で空配列）

### Frontend

- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` — `defaultKeyword` props とキーワード入力欄（`data-testid="resource-filter-keyword-input"`）を追加
- `frontend/src/app/(authenticated)/resources/page.tsx` — `SearchParams.keyword` を追加し `listResourcesAction`・`ResourceFilterForm` へ伝播
- `frontend/src/server/actions/resources.ts` — `ListResourcesParams.keyword` を追加
- `frontend/tests/unit/server/actions/resources.test.ts` — `keyword` パラメータのテストを追加

## Created Files

- `backend/src/main/java/com/example/bookflow/domain/ResourceSpecifications.java` — `category`/`isActive`/`keyword` の Specification 部品
- `backend/src/test/java/com/example/bookflow/domain/ResourceSpecificationsTest.java` — null/空文字条件の除外ロジック（BR-04）のユニットテスト

## Spec Updates

- `Docs/spec/api-spec.md` §`GET /api/resources` — `keyword` クエリパラメータを追記
- `Docs/spec/screen-spec.md` §`/resources` — キーワード検索欄を追記

## 対象外

- データベースマイグレーション：不要（実施せず）
- デプロイ関連の変更：不要（実施せず）
