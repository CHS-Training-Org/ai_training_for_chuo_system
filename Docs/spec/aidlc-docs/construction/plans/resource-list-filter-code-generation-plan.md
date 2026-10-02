# Code Generation Plan — resource-list-filter

## ユニットコンテキスト

- **実装するストーリー**: STORY-01（キーワードでリソースを検索する）
- **依存**: なし（単一ユニット）
- **契約**: `GET /api/resources` の `keyword` クエリパラメータ（任意、最大100文字）。既存呼び出し（`keyword` 未指定）は後方互換
- **所有エンティティ**: `Resource`（スキーマ変更なし）
- **設計根拠**: `Docs/spec/aidlc-docs/construction/resource-list-filter/nfr-design/nfr-design-patterns.md`（パターン1〜3）

## Step 1: Repository Layer Generation

- [ ] `ResourceRepository` に `@Query` カスタムJPQLメソッド `search`（ページネーション版・全件版の2オーバーロード）を追加
- [ ] `category`/`activeOnly`/`keyword` を null許容条件（`AND (:param IS NULL OR ...)`）で組み合わせ、`keyword` は `name`/`description` への `LOWER() LIKE ... ESCAPE '\'`
- [ ] 既存の派生クエリメソッド6本（`findByIsActiveTrue`×2, `findByCategoryAndIsActiveTrue`×2, `findByCategory`×2）を削除する（`ResourceService` 以外からの参照がないことを確認済み。置き換え後は未使用になるため）

## Step 2: Business Logic Generation（ResourceService）

- [ ] `list(...)` のシグネチャに `keyword`（`String`）を追加：`list(category, keyword, from, to, isAdmin, pageable)`
- [ ] パッケージプライベート static メソッド `prepareKeyword(String raw): String` を追加（trim→空文字列なら`null`→`%`/`_`エスケープ）。`overlaps` と同様にテスト可能な形で切り出す
- [ ] `listPaginated`/`fetchAllCandidates` の内部実装を、新しい `ResourceRepository.search(...)` 呼び出しに置き換える（`isAdmin` → `activeOnly = !isAdmin` に変換）

## Step 3: Business Logic Unit Testing（ResourceServiceTest）

- [ ] 既存の `List_` ネストクラス内のスタブ（`findByIsActiveTrue`等）を `resourceRepository.search(...)` のスタブに置き換える（既存の4テストケースの意図・アサーションは変更しない）
- [ ] 新規ネストクラス `PrepareKeyword` を追加し、`prepareKeyword` の単体テストを行う：
  - [ ] `prepareKeyword_null_returnsNull`
  - [ ] `prepareKeyword_blank_returnsNull`
  - [ ] `prepareKeyword_withPercentAndUnderscore_escapesWildcards`
  - [ ] `prepareKeyword_withLeadingTrailingWhitespace_trims`
- [ ] `List_` に `list_withKeyword_passesPreparedKeywordToRepository` を追加し、`keyword` が `search` に正しく伝播されることを検証

## Step 4: API Layer Generation（ResourceController）

- [ ] `list` メソッドに `@RequestParam(required = false) String keyword` を追加
- [ ] `keyword != null && keyword.length() > 100` の場合 `ValidationException` を送出（既存の `from`/`to` チェックと同じ関数内）
- [ ] `resourceService.list(...)` 呼び出しに `keyword` を伝播

## Step 5: API Layer Unit Testing（ResourceControllerTest）

- [ ] 結合テスト用にキーワード検証可能な seed リソースを1件追加（`KEYWORD_RESOURCE_ID`：name「特別会議室」、category ROOM、description「Projector included（プロジェクター完備）」、is_active true）。`@AfterEach` で削除も追加
- [ ] 以下のテストケースを追加：
  - [ ] `list_keywordMatchingName_returnsOnlyMatchingResource`
  - [ ] `list_keywordMatchingDescriptionCaseInsensitive_returnsMatchingResource`（`keyword=PROJECTOR` で大文字小文字非区別を確認）
  - [ ] `list_emptyKeywordParam_returnsAllActiveResources`（キーワード条件解除）
  - [ ] `list_keywordWithPercentWildcard_isTreatedAsLiteral_returnsEmpty`
  - [ ] `list_keywordWithCategoryFilter_combinesWithAndCondition`
  - [ ] `list_keywordExceeding100Chars_returns400ValidationError`

## Step 6: Frontend Components Generation

- [ ] `frontend/src/server/actions/resources.ts`：`ListResourcesParams` に `keyword?: string` を追加
- [ ] `frontend/src/app/(authenticated)/resources/page.tsx`：`SearchParams` interface に `keyword?: string` を追加し `listResourcesAction` へ伝播
- [ ] `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`：キーワード入力欄を追加（`label` 付き、`data-testid="resource-filter-keyword-input"`）。送信時に `category` と同様の扱いで `URLSearchParams` に `keyword` を付与（空文字列なら付与しない）

## Step 7: Frontend Components Unit Testing

- [ ] `frontend/tests/unit/server/actions/resources.test.ts` に「正常時: キーワードフィルタパラメータを渡せる」テストケースを追加（既存の「カテゴリフィルタパラメータを渡せる」と同様のパターン）
- [ ] `ResourceFilterForm`／`resources/page.tsx` 単体の既存テストファイルは存在しないため、新規作成はせず Build and Test 段階での手動確認（`pnpm dev`）に委ねる

## Step 8: Documentation Generation

- [ ] 本計画の実行結果サマリーを `Docs/spec/aidlc-docs/construction/resource-list-filter/code/summary.md` に記録（変更ファイル一覧・テスト結果の要約）

## Step 9: Deployment Artifacts Generation

- [ ] 該当なし（デプロイ構成・インフラの変更はないため、Infrastructure Design と同様に N/A）
