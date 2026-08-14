---
type: note
title: Code Generation Plan（resource-list-sort）
description: AI-DLC Code Generation ステージ Part 1（計画立案）が生成したリソース一覧ソート機能の実行計画
tags:
  - ai-dlc
  - code-generation
  - plan
timestamp: 2026-08-13
---

# Code Generation Plan — リソース一覧ソート機能（Unit: resource-list-sort）

このファイルは Code Generation（Part 2: 生成）における単一の真実の源である。各ステップは番号順に実行し、完了したチェックボックスから順に `[x]` を付ける。

## Unit Context

- **対象要件**: RES-01〜RES-07（`Docs/spec/aidlc-docs/inception/requirements/requirements.md`）
- **対象業務ルール**: BR-01〜BR-06（`Docs/spec/aidlc-docs/construction/resource-list-sort/functional-design/business-rules.md`）
- **Stories**: なし（User Stories ステージは単一ペルソナ・単純な要求のため SKIP 済み）
- **依存関係**: なし（前提課題「resource-list-filter」との組み合わせは本課題のスコープ外。`requirements.md` 参照）
- **データベースエンティティ**: `Resource`（既存、カラム変更なし）
- **設計変更の経緯**: 当初の Functional Design は「`from`/`to` 未指定時は `Pageable` を Repository へそのまま委譲する」想定だったが、Code Generation Planning 着手前の実測（稼働中 PostgreSQL コンテナへの直接クエリ）により、DB 委譲では BR-03（`capacity` null 末尾固定）・BR-05（`name` 大文字小文字非依存）を満たせないと判明した。両経路を「候補リスト全件取得 → `Comparator` でソート → 手動ページネーション」の単一フローに統合する（`Docs/spec/aidlc-audit.md` の「Code Generation Planning 準備」節、`business-logic-model.md` 参照）。

## Repository Layer / DB Migration / Deployment Artifacts の扱い

- **Database Migration Scripts**: SKIP（テーブル・カラムの変更なし）
- **Deployment Artifacts Generation**: SKIP（インフラ変更なし）
- **Repository Layer**: 新規メソッド追加は不要。Step 1 で不要になった既存メソッドを削除する。

---

## Step 1: Repository Layer 修正

- [x] `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` から、単一フロー統合により呼び出し元がなくなるページング付きメソッド3本を削除する
  - `Page<Resource> findByIsActiveTrue(Pageable pageable)`
  - `Page<Resource> findByCategoryAndIsActiveTrue(ResourceCategory category, Pageable pageable)`
  - `Page<Resource> findByCategory(ResourceCategory category, Pageable pageable)`
- [x] クラス Javadoc の「ページネーション有り / 無し の両形式を提供するのは〜」という説明を、単一フロー（全件取得のみ）に合わせて書き換える

## Step 2: Business Logic Generation（ResourceService）

- [x] `backend/src/main/java/com/example/bookflow/application/ResourceService.java` の `list` メソッドを単線化する
  - `listPaginated` メソッドを削除する
  - `list` 本体を次のフローに統合する: `fetchAllCandidates`（既存メソッドをそのまま流用）→ `from`/`to` が両方指定されている場合のみ占有中リソースを除外（既存ロジックを流用）→ `resolveComparator(pageable.getSort())` でソート → 手動ページネーション（既存の `subList` + `PageImpl` ロジックを流用）
- [x] `resolveComparator(Sort sort)` を追加する
  - `sort` が unsorted の場合は `createdAt` 昇順にフォールバックする
  - `name` → `Comparator.comparing(Resource::getName, String.CASE_INSENSITIVE_ORDER)`（BR-05）。降順時は `.reversed()`
  - `capacity` → `Comparator.comparing(Resource::getCapacity, Comparator.nullsLast(...))`（BR-03）。降順時は値部分のみ `.reversed()` し、null 判定（`nullsLast`）は変えない
  - `createdAt` → `Comparator.comparing(Resource::getCreatedAt)`。降順時は `.reversed()`
  - 上記以外のフィールド名（Controller 層のバリデーションを通過した場合は到達しない想定）は防御的に `ValidationException` を送出する

## Step 3: Business Logic Unit Testing（ResourceServiceTest）

- [x] `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` の既存テスト2件のモック対象を更新する（振る舞いの検証内容は変更しない）
  - `list_memberWithoutFilter_returnsActiveOnly`: `findByIsActiveTrue(pageable)` → `findByIsActiveTrue()`、戻り値を `PageImpl` → `List.of(...)` に変更
  - `list_adminWithoutFilter_returnsAllIncludingInactive`: `findAll(pageable)` → `findAll()`、戻り値を `PageImpl` → `List.of(...)` に変更
- [x] `makeResource` に `capacity` を指定できるオーバーロードを追加する（既存の4引数版は変更しない）
- [x] 新規テストを追加する
  - `list_sortByNameAsc_sortsCaseInsensitively`
  - `list_sortByNameDesc_sortsCaseInsensitivelyReversed`
  - `list_sortByCapacityAsc_nullsLast`
  - `list_sortByCapacityDesc_nullsLast`（BR-03 の回帰防止。DB 委譲では null が先頭に来ることを実測で確認済みのため、この観点は必須）
  - `list_sortByCreatedAtDesc_sortsDescending`
  - `list_unsortedPageable_defaultsToCreatedAtAsc`
  - `list_withTimeFilterAndSort_appliesSortAfterExclusion`（占有除外後にソートが適用されることを確認）

## Step 4: Business Logic Summary

- [x] Step 1〜3 の変更内容（変更ファイル・追加テスト件数）を Code Generation 完了報告に含める

## Step 5: API Layer Generation（ResourceController）

- [x] `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` に許可ソートフィールドの集合 `ALLOWED_SORT_FIELDS`（`name`・`capacity`・`createdAt`）を定数として追加する
- [x] `list` メソッド冒頭で `pageable.getSort()` の各 `Order` を検証し、`ALLOWED_SORT_FIELDS` に含まれないプロパティ名があれば `ValidationException` を送出する（BR-01・BR-04）
- [x] `@PageableDefault` にデフォルトソート（`sort = "createdAt", direction = Sort.Direction.ASC`）を明示する（BR-02）
- [x] 必要な import（`java.util.Set`、`org.springframework.data.domain.Sort`）を追加する

## Step 6: API Layer Unit Testing（ResourceControllerTest）

- [x] `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` に新規テストを追加する。ソート検証専用のデータ（`capacity` 値あり・大文字小文字混在の `name`・重複しない `created_at` を持つリソース）は既存の `@BeforeEach` シードを変更せず、各テストメソッド内で `jdbcTemplate` を用いて個別に挿入・削除する（既存シードと干渉しない `VEHICLE` カテゴリを使用）
  - `list_sortByNameAsc_returnsCaseInsensitiveAlphabeticalOrder`
  - `list_sortByCapacityDesc_returnsNullsLast`（BR-03 の回帰防止。本ステージ着手の契機となった実測の対象そのもの）
  - `list_invalidSortField_returns400ValidationError`
  - `list_defaultSortNotSpecified_returnsCreatedAtAscOrder`
  - `list_categoryAndSortCombined_appliesSort`
  - `list_timeFilterAndSortCombined_appliesSortAfterExclusion`
- [x] `./gradlew test --tests "*ResourceControllerTest*"` 実行、27件全て成功を確認

## Step 7: API Layer Summary

- [x] Step 5〜6 の変更内容を Code Generation 完了報告に含める

## Step 8: Frontend Components Generation

- [x] `frontend/src/lib/labels.ts` に `RESOURCE_SORT_OPTIONS`（`name`・`capacity`・`createdAt` × `asc`/`desc` の6通り）を追加する
- [x] `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` を変更する
  - `ResourceFilterFormProps` に `defaultSort?: string` を追加する
  - `DEFAULT_SORT = "createdAt,asc"` を定数として追加する
  - ソート選択用の `Select`（既存の「カテゴリ」`Select` と同じパターン）を追加する。`data-testid` は `resource-filter-form-sort-select` とする（自動化対応）
  - `handleSubmit` に `sort` の取得・URL パラメータ付与ロジックを追加する（`DEFAULT_SORT` と一致する場合は付与しない）
- [x] `frontend/src/app/(authenticated)/resources/page.tsx` を変更する
  - `SearchParams` 型に `sort?: string` を追加する
  - `ResourceFilterForm` へ `defaultSort={params.sort}` を渡す
  - `listResourcesAction` の呼び出しに `sort: params.sort` を追加する
  - `PaginationNav` の `query` は既存の `params` オブジェクトをそのまま渡しているため、`sort` は自動的に含まれる（変更不要。生成時に確認のみ行う）
- [x] `frontend/src/server/actions/resources.ts` を変更する
  - `ListResourcesParams` に `sort?: string` を追加する
  - `listResourcesAction` の `queryParams` 組み立てに `if (params?.sort) queryParams.sort = params.sort;` を追加する

## Step 9: Frontend Components Unit Testing

- [x] `frontend/tests/unit/server/actions/resources.test.ts` に、`listResourcesAction` へ `sort` を渡した場合にクエリパラメータへ正しく反映されること・未指定時は含まれないことを検証するテストを追加する
- [x] `ResourceFilterForm` は既存にテストが存在せず、本課題のスコープ（バックエンドの実装量が中心、フロントは UI 追加のみ）でも新規コンポーネントテストは要求されていないため、新規作成は行わない
- [x] `pnpm test resources`（13件）・`pnpm lint`・`pnpm build`（型チェック兼ねる）実行、いずれも成功を確認

## Step 10: Frontend Components Summary

- [x] Step 8〜9 の変更内容を Code Generation 完了報告に含める

## Step 11: Documentation Generation

- [x] `Docs/spec/aidlc-docs/construction/resource-list-sort/code/summary.md` を生成し、変更ファイル一覧・追加テスト一覧をまとめる
- [x] `api-spec.md`・`screen-spec.md` の更新、および `resource-list-sort.md`・`resource-list-filter.md` の受入条件・依存関係節の更新は、Build and Test 完了後に `/update-spec` で行う旨を明記する（本ステージの対象外）
