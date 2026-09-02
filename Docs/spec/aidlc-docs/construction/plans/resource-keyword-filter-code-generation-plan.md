---
type: spec
title: Code Generation Plan - resource-keyword-filter
description: AI-DLC Code Generation ステージ（Part 1: Planning）の成果物。resource-list-filter エンハンス課題のユニット resource-keyword-filter
tags:
  - ai-dlc
  - code-generation
  - resource
  - search
  - filter
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../resource-keyword-filter/functional-design/business-rules.md
  - ../resource-keyword-filter/functional-design/frontend-components.md
  - ../../inception/requirements/requirements.md
---

# Code Generation Plan - resource-keyword-filter

このプランが Code Generation の単一の情報源（single source of truth）である。各ステップは Functional Design 成果物（`business-rules.md` BR-01〜06、`frontend-components.md`）と設計方針（`@Query` JPQL 1メソッド集約）に基づく。

## Unit Context

- **Unit Name**: `resource-keyword-filter`
- **対象ストーリー**: ビジネス要求シート RES-01〜04（`docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`）
- **依存**: なし（既存の `Resource`/`ResourceRepository`/`ResourceService`/`ResourceController`、`ResourceFilterForm.tsx`/`resources/page.tsx`/`server/actions/resources.ts` を変更）
- **Workspace Root**: `/workspace`（`Docs/spec/aidlc-docs/` にアプリケーションコードは置かない）

## 実行ステップ

### Repository Layer

- [x] **Step 1**: `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` を変更する。既存の `findByIsActiveTrue(Pageable)`・`findByIsActiveTrue()`・`findByCategoryAndIsActiveTrue(ResourceCategory, Pageable)`・`findByCategoryAndIsActiveTrue(ResourceCategory)`・`findByCategory(ResourceCategory, Pageable)`・`findByCategory(ResourceCategory)` の6メソッドを、`@Query`（JPQL）1メソッド `search(ResourceCategory category, boolean activeOnly, String keyword, Pageable pageable)` に置き換える（`Page<Resource>` 戻り値。`Pageable.unpaged()` 呼び出しで全件取得にも流用する）。`findByIdForUpdate` は変更しない

### Business Logic Layer

- [x] **Step 2**: `backend/src/main/java/com/example/bookflow/application/ResourceService.java` を変更する。`list()` に `String keyword` 引数を追加し、`normalizeKeyword()`（null・空文字・空白のみを `null` に正規化）を経由して `listPaginated()`/`listWithAvailabilityFilter()`/`fetchAllCandidates()` に渡す。いずれも Step 1 の `resourceRepository.search(...)` を呼ぶよう変更する（`isActiveOnly = !isAdmin`）

### API Layer

- [x] **Step 3**: `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` の `list()` に `@RequestParam(required = false) String keyword` を追加し、`resourceService.list(...)` に渡す。Javadoc の `@param` を追記する

### Business Logic / API Unit Testing

- [x] **Step 4**: `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` の `List_` ネストクラスを更新する。既存4テストの `resourceRepository` モックを新しい `search(...)` メソッドへの `when(...)` に置き換え（振る舞いは変更しない）、`keyword` が空白のみのとき `resourceRepository.search(...)` へ `null` が渡ることを検証するテストを1件追加する（BR-03）
- [x] **Step 5**: `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` に、`description` を含む3件目のシードリソース（`DESC_MATCH_RESOURCE_ID`）を追加し、以下の統合テストを追加する（H2 実DB・ADR-018 命名規約）：
  - `list_keywordMatchingName_returnsOnlyMatchingResource`（name 一致・BR-01）
  - `list_keywordMatchingDescription_returnsOnlyMatchingResource`（description 一致・BR-01）
  - `list_keywordCaseInsensitive_matchesRegardlessOfCase`（大文字小文字非区別・BR-02）
  - `list_blankKeyword_returnsAllActiveResources`（空白のみ→条件解除・BR-03）
  - `list_keywordWithCategoryMismatch_returnsEmpty`（category との AND・BR-04）
  - `list_keywordNoMatch_returnsEmptyContent`（非該当）

### Frontend Components

- [x] **Step 6**: `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` を変更する。`defaultKeyword?: string` プロップを追加し、カテゴリ・期間と並ぶキーワード `Input`（`name="keyword"`, `data-testid="resource-filter-keyword-input"`）を追加する。`handleSubmit` で `keyword` を `trim()` し、空でなければ `params.set("keyword", trimmed)` する
- [x] **Step 7**: `frontend/src/app/(authenticated)/resources/page.tsx` を変更する。`SearchParams` に `keyword?: string` を追加し、`listResourcesAction()` と `ResourceFilterForm` の props に伝搬する
- [x] **Step 8**: `frontend/src/server/actions/resources.ts` を変更する。`ListResourcesParams` に `keyword?: string` を追加し、`listResourcesAction()` 内で非空の場合のみ `queryParams.keyword` を設定する

### Frontend Unit Testing

- [x] **Step 9**: `frontend/tests/unit/server/actions/resources.test.ts` の `listResourcesAction` describe ブロックに、既存の「カテゴリフィルタパラメータを渡せる」テストと同様の様式で「キーワードパラメータを渡せる」テストを1件追加する

### Documentation

- [x] **Step 10**: 仕様書更新（`docs-next/docs/spec/api-spec.md`・`screen-spec.md`・`requirements.md`）は `/update-spec` により Code Generation 開始前に完了済み（監査ログ参照）

## Story Traceability

| ステップ | 対応要件 |
|---|---|
| Step 1-5 | RES-01, RES-02, RES-04（バックエンド） |
| Step 6-9 | RES-03（フロントエンド） |
| Step 10 | 影響範囲節（spec 更新） |
