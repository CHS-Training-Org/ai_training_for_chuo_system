# Code Generation Plan: resource-list-filter

このプランが Code Generation の唯一の正。ユニットは縦切り 1 つ（BE + FE）。

## Unit Context
- **要件**: requirements.md の FR-01〜10。受入条件はシートの 6 項目
- **設計**: application-design/ 配下（Specification 方式、派生クエリ削除、Controller 検証）
- **Stories**: なし（User Stories は SKIP）
- **依存**: DB スキーマ変更なし。後続課題（resource-list-sort、reservation-list-filter）の土台になる
- **コード配置**: ワークスペースルート（`backend/`、`frontend/`、`docs-next/`）。`Docs/spec/aidlc-docs/` にはコードを置かない

## Steps

### Spec-first
- [x] Step 1: `/update-spec` で `docs-next/docs/spec/api-spec.md` §`GET /api/resources` に `keyword` を追記（パラメータ表、挙動、100 文字超の 400）
- [x] Step 2: `/update-spec` で `docs-next/docs/spec/screen-spec.md` §`/resources` にキーワード入力欄と 0 件メッセージを追記。`timestamp` 等の frontmatter と `docs-next/CLAUDE.md` の文章規範を守る
- [x] Step 3: `cd docs-next && npm run build` でリンク・アンカーの破損がないことを確認

### Backend
- [x] Step 4: `domain/ResourceSpecifications.java` を新規作成（`isActive`、`hasCategory`、`keywordContains`、`forList`、`escapeLike`。LIKE は ESCAPE 付きで小文字比較）
- [x] Step 5: `domain/ResourceRepository.java` を `JpaSpecificationExecutor<Resource>` 継承に変更し、派生クエリ 8 本を削除（`findByIdForUpdate` は残す。クラス Javadoc も更新）
- [x] Step 6: `application/ResourceService.java` の `list` に `keyword` を追加。`listPaginated` は `findAll(spec, pageable)`、`listWithAvailabilityFilter` は `findAll(spec)`。`fetchAllCandidates` を削除
- [x] Step 7: `presentation/ResourceController.java` に `keyword` を追加。`normalizeKeyword`（trim、空は null、101 文字以上は `ValidationException`）。Javadoc を更新
- [x] Step 8: `ResourceSpecificationsTest`（新規）: 部分一致、大文字小文字、name と description の OR、description が null、`%` `_` `\` のリテラル扱い、category・isActive との AND。H2 で `lower(description)`（TEXT）が動くかも確認
- [x] Step 9: `ResourceServiceTest` を新シグネチャに更新し、keyword あり、`from`/`to` との併用、ADMIN と非 ADMIN のケースを追加
- [x] Step 10: `ResourceControllerTest` に追加: keyword 指定、前後空白の除去、空白のみは未指定扱い、100 文字は OK、101 文字は 400、未指定時は従来どおり
- [x] Step 11: `./gradlew spotlessApply`、`./gradlew checkstyleMain`、`./gradlew test`

### Frontend
- [x] Step 12: `src/server/actions/resources.ts` の `ListResourcesParams` に `keyword` を追加し、query に載せる
- [x] Step 13: `ResourceFilterForm.tsx` にキーワード入力欄を追加（`name="keyword"`、`maxLength={100}`、`defaultKeyword`、非空のときだけ URL に付与、`data-testid` を付ける）。あわせて未使用の `searchParams` 依存と無意味な `replace("T", "T")` を整理するかは、スコープ外のため触らない
- [x] Step 14: `resources/page.tsx` の `SearchParams` に `keyword` を追加し、Action とフォームへ渡し、0 件メッセージを出し分ける。`PaginationNav` の `query` に `keyword` が引き継がれることを確認
- [x] Step 15: `tests/unit/server/actions/resources.test.ts` に、`keyword` が query に渡るテストを追加（MSW のハンドラでクエリを検証）
- [x] Step 16: `pnpm lint`、`pnpm format:check`、`pnpm test`

### Summary
- [x] Step 17: `Docs/spec/aidlc-docs/construction/resource-list-filter/code/summary.md` に変更ファイル一覧（Modified / Created）を記録

## 検証の位置づけ
Step 11 と 16 は各層の自己確認。結果は Build and Test ステージで再度まとめる。

## Scope Notes
- DB インデックス追加、ソート、E2E は対象外
- 既存の軽微な技術的負債（`ResourceFilterForm` の未使用依存など）は触らない
