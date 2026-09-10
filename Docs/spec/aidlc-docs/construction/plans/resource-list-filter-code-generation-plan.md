# Code Generation Plan — resource-list-filter

> このプランが Code Generation の単一の真実の源。ステップは番号順に実行し、完了したら `[x]` に更新する。
> ユニット：単一ユニット（Units Generation はスキップ。エンハンス課題としての規模が小さく複数ユニットへの分解は不要と判断）。
> 対象タスク：`docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（RES-01〜RES-04）
> 設計判断：`@Query` を採用（Specification は不採用）。理由は `Docs/spec/aidlc-audit.md` の「Construction - 設計判断」エントリ参照。

## ユニットコンテキスト

- **実装するストーリー**: RES-01（keyword クエリパラメータ追加）、RES-02（大文字小文字を区別しない検索）、RES-03（`ResourceFilterForm` にキーワード入力欄）、RES-04（AND 条件での組み合わせ）
- **依存**: 既存の `GET /api/resources`・`ResourceFilterForm.tsx` のみ（前提課題なし）
- **DB エンティティ**: `resources`（既存カラム `name`/`description` のみ使用。スキーマ変更なし）
- **spec 更新**: `api-spec.md` §`GET /api/resources`・`screen-spec.md` §`/resources` は `/update-spec` で更新済み（Step 0 として済マーク）

---

## Step 0: Spec 更新（完了済み）
- [x] `api-spec.md` §`GET /api/resources` に `keyword` クエリパラメータを追記
- [x] `screen-spec.md` §`/resources` にキーワード検索欄の UI 要素を追記
- [x] `cd docs-next && npm run build` で壊れたリンク・アンカーがないことを確認

## Step 1: Repository Layer Generation（バックエンド）
- [x] `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` を修正（既存8メソッドは削除・変更しない）
  - 新規 `@Query` メソッドを2本追加：
    ```java
    @Query("""
        SELECT r FROM Resource r
        WHERE (:category IS NULL OR r.category = :category)
          AND (:isAdmin = true OR r.isActive = true)
          AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    Page<Resource> searchByFilters(
        @Param("category") ResourceCategory category,
        @Param("isAdmin") boolean isAdmin,
        @Param("keyword") String keyword,
        Pageable pageable);

    @Query("""
        SELECT r FROM Resource r
        WHERE (:category IS NULL OR r.category = :category)
          AND (:isAdmin = true OR r.isActive = true)
          AND (LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    List<Resource> searchByFilters(
        @Param("category") ResourceCategory category,
        @Param("isAdmin") boolean isAdmin,
        @Param("keyword") String keyword);
    ```
  - `keyword` は呼び出し側（`ResourceService`）で非 null・非空白が保証された値のみ渡す前提（メソッド内で null チェックしない）。
  - JPQL は H2 / PostgreSQL 両対応のため `ILIKE`（Postgres 専用）ではなく `LOWER()` + `LIKE` を使う。
  - Javadoc を既存メソッドと同スタイルで追加。

## Step 2: Business Logic Generation（バックエンド）
- [x] `backend/src/main/java/com/example/bookflow/application/ResourceService.java` を修正
  - `list(...)` に `String keyword` パラメータを追加（シグネチャ：`list(ResourceCategory category, String keyword, LocalDateTime from, LocalDateTime to, boolean isAdmin, Pageable pageable)`）
  - メソッド先頭で `keyword` を正規化：`StringUtils.hasText(keyword) ? keyword.trim() : null`（`org.springframework.util.StringUtils` を import）
  - `listPaginated(category, keyword, isAdmin, pageable)`：`keyword != null` なら `resourceRepository.searchByFilters(category, isAdmin, keyword, pageable)` を呼ぶ分岐を追加。`keyword == null` の場合は既存の4分岐（`findByCategory`/`findByCategoryAndIsActiveTrue`/`findAll`/`findByIsActiveTrue`）をそのまま使う（変更しない）
  - `fetchAllCandidates(category, keyword, isAdmin)`：同様に `keyword != null` なら `resourceRepository.searchByFilters(category, isAdmin, keyword)`（List 版）を呼ぶ分岐を追加。`keyword == null` の場合は既存分岐を維持
  - `listWithAvailabilityFilter(category, keyword, from, to, isAdmin, pageable)`：`fetchAllCandidates` 呼び出しに `keyword` を渡すよう修正
  - Javadoc を更新し、`keyword` パラメータの説明（RES-01〜04 準拠）を追加

## Step 3: Business Logic Unit Testing（バックエンド）
- [x] `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` に以下を追加（Mockito、`resourceRepository.searchByFilters(...)` をモック）
  - `list_withKeyword_callsSearchByFiltersInsteadOfFindByCategory`：keyword 指定時に `searchByFilters` が呼ばれ、`findByCategory` 系が呼ばれないことを検証
  - `list_withKeywordAndTimeRange_callsSearchByFiltersListVariant`：keyword + from/to 指定時に List 版 `searchByFilters` が呼ばれることを検証
  - `list_withBlankKeyword_treatsAsNoKeywordFilter`：空白のみの keyword が null 相当として扱われ既存分岐が呼ばれることを検証

## Step 4: API Layer Generation（バックエンド）
- [x] `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` を修正
  - `list(...)` に `@RequestParam(required = false) String keyword` を追加（`category` の直後、api-spec.md のクエリパラメータ順に合わせる）
  - `resourceService.list(category, keyword, from, to, isAdmin, pageable)` へ渡すよう呼び出しを修正
  - Javadoc の `@param` に `keyword` を追加

## Step 5: API Layer Unit Testing（バックエンド）
- [x] `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` に以下を追加（既存の `insertSeedData`/`deleteSeedData` を利用する結合テスト、H2 実DB）
  - テストデータに `description` を含む3件目のリソース（例：`名称に一致しないが説明文に「プロジェクター」を含むリソース`）を用意
  - `list_withKeywordMatchingName_returnsMatchingResourceOnly`：`keyword=会議室` で `ACTIVE_RESOURCE_ID`（第1会議室）のみ返る
  - `list_withKeywordMatchingDescription_returnsMatchingResourceOnly`：説明文一致のケース
  - `list_withKeywordDifferentCase_isCaseInsensitive`：大文字小文字違いでもヒットする（RES-02）
  - `list_withKeywordAndCategory_combinesWithAndCondition`：`category`+`keyword` の AND 条件（RES-04）
  - `list_withKeywordNoMatch_returnsEmptyContent`：一致なしで空配列
  - `list_adminWithKeywordAndInactiveResource_includesInactiveIfNameMatches`：ADMIN は inactive でも keyword 一致すれば含まれる

## Step 6: Frontend Components Generation
- [x] `frontend/src/server/actions/resources.ts` を修正
  - `ListResourcesParams` に `keyword?: string` を追加
  - `listResourcesAction` に `if (params?.keyword) queryParams.keyword = params.keyword;` を追加
- [x] `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` を修正
  - `ResourceFilterFormProps` に `defaultKeyword?: string` を追加
  - フィルタグリッドにキーワード入力欄（`Label` + `Input type="text" name="keyword"`）を追加（`grid-cols-3` を `grid-cols-4` に変更し、カテゴリの前または開始日時の前に配置。UI 上は「カテゴリ・キーワード・開始日時・終了日時」の並びとする）
  - `handleSubmit` で `const keyword = data.get("keyword") as string; if (keyword) params.set("keyword", keyword);` を追加
- [x] `frontend/src/app/(authenticated)/resources/page.tsx` を修正
  - `SearchParams` に `keyword?: string` を追加
  - `listResourcesAction` 呼び出しに `keyword: params.keyword` を追加
  - `ResourceFilterForm` に `defaultKeyword={params.keyword}` を追加

## Step 7: Frontend Components Unit Testing
- [x] `frontend/tests/unit/server/actions/resources.test.ts` に以下を追加
  - `it("正常時: キーワードフィルタパラメータを渡せる", ...)`：`listResourcesAction({ keyword: "会議室" })` が成功しレスポンスを返すことを検証（既存の「カテゴリフィルタパラメータを渡せる」テストと同スタイル）

## Step 8: Documentation Generation
- [x] 本プランの各ステップ完了時にチェックボックスを更新（追加のドキュメント生成は不要。spec 更新は Step 0 で完了済み）

> **実施メモ**: Step 5 のテストメソッド名は実装時に一部変更・追加した（`list_adminWithKeywordMatchingInactiveResourceName_includesInactiveResource`・`list_memberWithKeywordMatchingInactiveResourceName_excludesInactiveResource`・`list_withBlankKeyword_behavesSameAsNoKeyword` を追加）。カバー範囲（RES-01〜04・ADMIN可視性・大文字小文字・空白keyword）は計画どおり。

## Step 9: Build and Test（このユニット分の事前確認。全体の Build and Test ステージは全ユニット完了後に別途実施）
- [x] `cd backend && ./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"` が pass する
- [x] `cd backend && ./gradlew spotlessApply checkstyleMain` が pass する
- [x] `cd frontend && pnpm test resources` が pass する
- [x] `cd frontend && pnpm lint` が pass する
