---
type: spec
title: Code Generation Plan - resource-keyword-filter
description: AI-DLC Code Generation ステージ Part 1（計画）の成果物。resource-keyword-filter ユニットの実装手順
tags:
  - ai-dlc
  - code-generation
  - plan
  - resource
timestamp: 2026-08-14
audience: 学習者・メンター
references:
  - Docs/spec/aidlc-docs/construction/resource-keyword-filter/functional-design/business-logic-model.md
  - Docs/spec/aidlc-docs/construction/resource-keyword-filter/functional-design/business-rules.md
  - Docs/spec/aidlc-docs/construction/resource-keyword-filter/functional-design/frontend-components.md
---

# Code Generation Plan - resource-keyword-filter

## ユニットコンテキスト

- **ユニット**: `resource-keyword-filter`（Units Generation は SKIP。単一ユニットとして扱う）
- **対象要件**: RES-01〜RES-04（`Docs/spec/enhancements/resource-list-filter.md`）
- **依存する Functional Design 決定**: `ResourceRepository` の検索条件を `@Query`（JPQL）1メソッドに集約する（`business-logic-model.md` の設計判断）
- **本ユニットが所有するエンティティ**: なし（既存 `Resource` エンティティの既存カラムを利用。スキーマ変更なし）
- **既存コードとの境界**: `ResourceController`/`ResourceService`/`ResourceRepository`（バックエンド）と `ResourceFilterForm.tsx`/`page.tsx`/`resources.ts`（フロントエンド）の既存ファイルを修正する。新規ファイルの作成はない

## 実装手順

### Step 1: Repository Layer Generation
- [x] `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` を修正する
  - 既存の6メソッド（`findByIsActiveTrue(Pageable)`／`findByIsActiveTrue()`／`findByCategoryAndIsActiveTrue(category, Pageable)`／`findByCategoryAndIsActiveTrue(category)`／`findByCategory(category, Pageable)`／`findByCategory(category)`）を削除する
  - 代わりに `@Query`（JPQL）による2メソッドを追加する：
    - `Page<Resource> search(ResourceCategory category, boolean activeOnly, String keyword, Pageable pageable)`
    - `List<Resource> search(ResourceCategory category, boolean activeOnly, String keyword)`
  - JPQL は `(:category IS NULL OR r.category = :category)` `AND (:activeOnly = FALSE OR r.isActive = TRUE)` `AND (:keyword IS NULL OR LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR (r.description IS NOT NULL AND LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%'))))` の3条件を AND で組み合わせる（BR-01・BR-02・BR-04・BR-05 準拠。当初 `COALESCE(r.description, '')` を検討したが、PostgreSQL 実機で `function lower(bytea) does not exist` が発生したため `r.description IS NOT NULL AND ...` 方式に変更した。H2 はこの型不整合を許容するためユニット・コントローラテストでは検出できず、Build and Test ステージの実機確認で判明した）
  - `findByIdForUpdate` はそのまま変更しない
  - クラス javadoc の説明（ページ有無を提供する理由）はそのまま維持する

### Step 2: Business Logic Generation（Service 層）
- [x] `backend/src/main/java/com/example/bookflow/application/ResourceService.java` を修正する
  - `list(ResourceCategory category, LocalDateTime from, LocalDateTime to, boolean isAdmin, Pageable pageable)` を `list(ResourceCategory category, String keyword, LocalDateTime from, LocalDateTime to, boolean isAdmin, Pageable pageable)` に変更する（`keyword` を `category` の直後に追加）
  - private static ヘルパー `normalizeKeyword(String keyword)` を追加する：`null` はそのまま、trim 後に空文字なら `null` を返す（BR-03）
  - `listPaginated`／`fetchAllCandidates` を `resourceRepository.search(category, !isAdmin, normalizedKeyword, ...)` を呼ぶ形に置き換える（`activeOnly = !isAdmin`）
  - `listWithAvailabilityFilter` は `fetchAllCandidates` 呼び出し部分を上記に合わせて更新し、以降の予約重複判定ロジック（`overlaps` 等）は変更しない
  - Javadoc の `@param` に `keyword` を追記する

### Step 3: API Layer Generation（Controller 層）
- [x] `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` を修正する
  - `list()` に `@RequestParam(required = false) String keyword` を追加する
  - `resourceService.list(category, keyword, from, to, isAdmin, pageable)` の順で呼び出す
  - Javadoc の `@param` に `keyword` を追記する

### Step 4: Repository/Service/API Unit Testing（バックエンド）
- [x] `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` の `List_` ネストクラスを修正する
  - 既存4テスト（`list_memberWithoutFilter_returnsActiveOnly`／`list_adminWithoutFilter_returnsAllIncludingInactive`／`list_memberWithTimeFilterAndOccupied_excludesOccupiedResource`／`list_memberWithTimeFilterAndAdjacentReservation_includesResource`）を、モック対象を `resourceRepository.search(...)` に変更し、`resourceService.list(...)` 呼び出しに `keyword` 引数（`null`）を追加する形に更新する
  - 新規テストを追加する：
    - `list_withBlankKeyword_normalizesToNullBeforeRepositoryCall`（空白のみの keyword が `search` に `null` として渡ることを `verify` で確認、BR-03）
    - `list_withKeyword_passesTrimmedKeywordToRepositoryCall`（前後空白付き keyword が trim されて `search` に渡ることを `verify` で確認）
  - `org.mockito.Mockito.verify` の static import を追加する
- [x] `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` を修正する
  - `insertSeedData()` の `ACTIVE_RESOURCE_ID` の INSERT 文に `description` カラムと値（`"プロジェクター完備(Wi-Fi)"`）を追加する（H2 の実データで keyword 検索を検証するため）
  - GET /api/resources 一覧セクションに新規テストを追加する：
    - `list_withKeywordMatchingName_returnsOnlyMatchingResource`（keyword=`第1` → ACTIVE_RESOURCE_ID のみ一致）
    - `list_withKeywordMatchingDescription_returnsOnlyMatchingResource`（keyword=`プロジェクター` → ACTIVE_RESOURCE_ID が一致）
    - `list_withKeywordCaseInsensitive_returnsMatchingResource`（keyword=`wi-fi`（小文字）→ 説明文中の `Wi-Fi` に一致）
    - `list_withKeywordNotMatching_returnsEmptyContent`（keyword=`存在しない文字列` → `$.content` が空配列）
    - `list_withBlankKeyword_returnsSameAsUnfiltered`（keyword=` `（空白）→ フィルタなし時と同じく ACTIVE_RESOURCE_ID が存在）
    - `list_withKeywordAndCategory_combinesWithAnd`（keyword=`第1` + category=`EQUIPMENT` → 一致なし。keyword=`第1` + category=`ROOM` → 一致あり）

### Step 5: Frontend Components Generation
- [x] `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` を修正する
  - `ResourceFilterFormProps` に `defaultKeyword?: string` を追加する
  - キーワード入力欄（`Input type="text" name="keyword" data-testid="resource-filter-keyword-input"`）を追加し、グリッドを `sm:grid-cols-4` に変更、順序はカテゴリ→キーワード→開始日時→終了日時とする
  - `handleSubmit` で `keyword` を取得し `.trim()` した結果が空文字でなければ `params.set("keyword", trimmed)` する
- [x] `frontend/src/app/(authenticated)/resources/page.tsx` を修正する
  - `SearchParams` に `keyword?: string` を追加する
  - `listResourcesAction` 呼び出しに `keyword: params.keyword` を追加する
  - `ResourceFilterForm` 呼び出しに `defaultKeyword={params.keyword}` を追加する
- [x] `frontend/src/server/actions/resources.ts` を修正する
  - `ListResourcesParams` に `keyword?: string` を追加する
  - `listResourcesAction` 内で `params?.keyword` があれば `queryParams.keyword` にセットする

### Step 6: Frontend Components Unit Testing
- [x] 調査の結果、`frontend/tests/unit/resources/` ディレクトリは存在するが空であり、`ResourceFilterForm` を直接対象とする既存テストファイルは無い。新規テストファイルの追加は本ユニットの必須範囲とせず、Build and Test ステージでの手動確認に委ねる（シートの推定工数・スコープに照らした判断）
- [x] `frontend/tests/unit/server/actions/resources.test.ts` の `listResourcesAction` 記述ブロックに、既存の「カテゴリフィルタパラメータを渡せる」テストと同じパターンで「キーワードパラメータを渡せる」テストを1件追加する（`listResourcesAction({ keyword: "会議室" })` を呼び、`result.content` が返ることを確認。MSW はクエリパラメータを検証しないため、パラメータが例外なく渡ることの確認に留まる）

### Step 7: Documentation Generation（Spec 更新）
- [x] `Docs/spec/api-spec.md` の `GET /api/resources` セクションのクエリパラメータ表に `keyword`（string, 任意, 名前・説明への部分一致）を追記し、注記に AND 条件・大文字小文字非依存である旨を追記する
- [x] `Docs/spec/screen-spec.md` の `/resources` セクションの UI 要素表に「キーワード検索」欄を追記する

## Story / 要件トレーサビリティ

| 実装ステップ | 対応要件 |
|---|---|
| Step 1（Repository） | RES-01・RES-02・RES-04 |
| Step 2（Service） | RES-01・RES-02・RES-04、BR-03（正規化） |
| Step 3（Controller） | RES-01 |
| Step 4（バックエンドテスト） | 受入条件「追加した検索ロジックに対応するユニットテストを追加する」「既存テストが引き続き pass する」 |
| Step 5（フロントエンド） | RES-03 |
| Step 7（Spec 更新） | シート「影響範囲」節 |

## 依存関係

Step 1 → Step 2 → Step 3 → Step 4 の順（バックエンドは下位レイヤーから）。Step 5・Step 7 は Step 3 完了後（API 契約確定後）に着手する。Step 6 は Step 5 の後。
