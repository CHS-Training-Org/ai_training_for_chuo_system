# Code Generation Plan — ユニット: resource-search（リソース検索・フィルタ追加）

## Unit Context

- **Stories implemented**: US-01, US-02, US-03, US-04（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（既存の `ResourceController`/`ResourceService`/`ResourceRepository`/`ResourceFilterForm`/`resources/page.tsx`/`server/actions/resources.ts` を変更する brownfield 修正）
- **Database entities owned**: `Resource`（スキーマ変更なし、クエリのみ追加）
- **Service boundaries**: backend の `application`/`domain`/`presentation` 層内、frontend の `resources` 画面・BFF 層内に閉じる

## 技術判断（Functional Design で保留していた実装機構の決定）

- **クエリ機構**: `ResourceRepository` に **新規 `@Query`（JPQL）メソッド**を追加する（`Specification` は導入しない）。理由：既存コードベースに `@Query` の実例（`findByIdForUpdate`）がありパターンとして一貫する。keyword が指定された場合のみこの新規メソッドを使用し、**keyword が null の場合は既存の派生クエリメソッドをそのまま使い続ける**（`ResourceServiceTest` の strict stubs を壊さないための制約、`requirements.md` 技術コンテキスト参照）
- **大文字小文字非依存**: `LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))`（`description` は `r.description IS NOT NULL AND LOWER(...)...` で NULL ガード）。DB 固有の `ILIKE` は使わない
- **エスケープ**: Java 側で `keyword` 中の `\`・`%`・`_` を `\\`・`\%`・`\_` に置換してから JPQL に渡し、`LIKE ... ESCAPE '\'` を付与する
- **正規化**: `ResourceService#list` の先頭で `keyword` を trim し、空文字なら `null` に変換する（BR-02）

## 実行ステップ

- [x] **Step 1: 仕様書更新（Spec-first）**
  - `/update-spec` スキルで `docs-next/docs/spec/api-spec.md`（`GET /api/resources` に `keyword` パラメータ追記）・`docs-next/docs/spec/screen-spec.md`（`/resources` のフィルタフォーム・空状態メッセージ追記）を更新する
  - Story mapping: 全ストーリー（仕様の前提となるドキュメント更新）

- [x] **Step 2: Repository 層生成**
  - `ResourceRepository` に keyword 検索用の `@Query` メソッドを追加（Page 版・List 版、category 任意・isActive 有無の組み合わせに対応する引数設計）
  - Story mapping: US-01, US-02, US-03

- [x] **Step 3: Business Logic 層生成**
  - `ResourceService#list` のシグネチャに `String keyword` を追加
  - keyword 正規化（trim・空文字→null）
  - keyword が非 null の場合のエスケープ処理・新規 Repository メソッド呼び出しへの分岐（`listPaginated`・`listWithAvailabilityFilter`（`fetchAllCandidates`）の両方に適用）
  - keyword が null の場合は既存ロジック（既存派生クエリ呼び出し）を変更しない
  - Story mapping: US-01, US-02, US-03

- [x] **Step 4: Business Logic 層ユニットテスト**
  - `ResourceServiceTest` の既存呼び出し箇所（`resourceService.list(...)`）に `keyword` 引数（`null`）を追加（アサーションは変更しない）
  - 新規テスト追加：keyword 部分一致・大文字小文字非依存・空白のみ入力時の未適用・category との AND・from/to 指定時の keyword 適用
  - 注記：Mockito 単体テストは Repository がモックのため実際の LIKE 照合は検証できない。大文字小文字非依存・`description` が NULL のレコードの扱いは Step 6（H2 結合テスト）で検証する
  - Story mapping: US-01, US-02, US-03

- [x] **Step 5: API 層生成**
  - `ResourceController#list` に `@RequestParam(required = false) String keyword` を追加し `resourceService.list(...)` へ渡す
  - Story mapping: US-01, US-02, US-03

- [x] **Step 6: API 層ユニットテスト**
  - `ResourceControllerTest` に keyword 検索の統合テストを追加（H2 実データに対する部分一致・大文字小文字非依存・`%`/`_` エスケープ・NULL description・category/from-to との AND・ロール別可視範囲・空白のみ入力）
  - Story mapping: US-01, US-02, US-03

- [x] **Step 7: Backend 層サマリ**
  - backend 側の変更点を `Docs/spec/aidlc-docs/construction/resource-search/code/backend-summary.md` に記録

- [x] **Step 8: Frontend Components 生成**
  - `frontend/src/server/actions/resources.ts`: `ListResourcesParams`/`listResourcesAction` に `keyword` 追加
  - `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`: `defaultKeyword` prop・キーワード入力欄・`handleSubmit` の trim 処理
  - `frontend/src/app/(authenticated)/resources/page.tsx`: `SearchParams.keyword`・`listResourcesAction` 呼び出し・空状態メッセージ分岐（`hasKeyword`）
  - `data-testid` を新規入力要素に付与（`resource-filter-form-keyword-input` 等、Automation Friendly Code Rules 準拠）
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 9: Frontend Components ユニットテスト**
  - `frontend/tests/unit/server/actions/resources.test.ts` に keyword パラメータ中継のテストケースを追加
  - Story mapping: US-01

- [x] **Step 10: Frontend 層サマリ**
  - frontend 側の変更点を `Docs/spec/aidlc-docs/construction/resource-search/code/frontend-summary.md` に記録

## スコープ外（本プランに含めない）

- データベースマイグレーション（スキーマ変更不要のため対象外）
- デプロイメント成果物生成（インフラ変更なし、Workflow Planning で Infrastructure Design を SKIP 済み）
- E2E テスト（`Docs/spec/aidlc-docs/inception/requirements/requirements.md` のスコープ外に明記済み）

## 本プランが Code Generation の唯一の正とする

本ステップ順序・内容が Part 2（Generation）実行の単一の正とする。逸脱する場合は本ファイルを更新してから実行する。
