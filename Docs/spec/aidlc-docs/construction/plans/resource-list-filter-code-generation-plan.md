# Code Generation Plan: resource-list-filter

> この計画が Code Generation の唯一の実行順序（Single Source of Truth）。承認後は計画どおりに進め、完了したステップを `[x]` にする。

## Unit Context

- **Unit**: `resource-list-filter`（単一ユニット、縦切り 1 本、Issue #76）
- **Stories**: User Stories はスキップ。代わりに `requirements.md` の FR-01 から FR-09 と受入条件 6 項目に対応づける
- **Dependencies**: 他ユニットなし。frontend は backend の `keyword` に依存するため backend を先に実装する
- **Expected Contract**: `GET /api/resources?keyword=<文字列>`（任意。`name` / `description` の部分一致、大文字小文字無視、前後空白除去、空なら条件なし）
- **Database Entities**: 変更なし（`resources` テーブルのスキーマ・Flyway は触れない）
- **Code Location**: ワークスペース直下の既存構成（`backend/src/...`、`frontend/src/...`）。既存ファイルはその場で修正し、複製は作らない

## 設計方針（本計画で確定する実装の形）

1. **キーワードが空・未指定のときは既存コードをそのまま通す**。派生クエリ 6 本と既存の分岐は変更しない。これで FR「未指定時は既存と同一」と、既存テスト（Mockito でそれらをスタブ）の pass を同時に満たす。
2. **キーワードがあるときだけ新しい JPQL を使う**。ページあり・なしの 2 本（`from`/`to` ありの経路は全件取得のため、ページなし版が要る）。
3. **JPQL に null を渡さない**。PostgreSQL は `:param IS NULL` の型推論に失敗することがあり、テストは H2 なので CI で見逃しやすい。そのため、カテゴリは `IN :categories`（未指定時はサービスが全カテゴリを渡す）、有効無効は `:includeInactive`（boolean）で表現する。
4. **`ResourceService.list` の旧シグネチャは残す**（`keyword = null` で新メソッドへ委譲するオーバーロード）。既存の `ResourceServiceTest` が旧シグネチャを呼ぶため。
5. **`%` と `_` はエスケープしない**（要件 Q2 の決定。値はバインドパラメータなのでインジェクションは起きない）。

## Steps

### Part A: 仕様（Spec-first）

- [x] **Step 1**: `/update-spec` を起動し、次の 2 ファイルを更新する（FR-01 から FR-04、FR-06）
  - `docs-next/docs/spec/api-spec.md` §`GET /api/resources`：`keyword` をクエリパラメータ表に追加。部分一致、大文字小文字無視、前後空白除去、空なら条件なし、AND 結合、`%` と `_` がワイルドカードとして働くこと、リクエスト例を追記
  - `docs-next/docs/spec/screen-spec.md` §`/resources`：UI 要素表にキーワード入力欄を追記
  - 文章は `docs-next/CLAUDE.md` の規範に従い、`cd docs-next && npm run build` でリンク・アンカーの破損がないことを確認する

### Part B: backend

- [x] **Step 2**（Repository 層）：`backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` を修正
  - `Page<Resource> searchByKeyword(categories, includeInactive, keyword, Pageable)` と `List<Resource> searchByKeyword(categories, includeInactive, keyword)` を `@Query` で追加（FR-01、FR-02、FR-08、FR-09）
  - 条件：`r.category IN :categories`、`(:includeInactive = true OR r.isActive = true)`、`(LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(r.description) LIKE LOWER(CONCAT('%', :keyword, '%')))`（OR は括弧で囲み、AND との優先順位を固定する）
  - 既存の派生クエリは変更しない
- [x] **Step 3**（Service 層）：`backend/src/main/java/com/example/bookflow/application/ResourceService.java` を修正
  - `list(category, keyword, from, to, isAdmin, pageable)` を追加し、旧 `list(category, from, to, isAdmin, pageable)` は `keyword = null` で委譲するオーバーロードとして残す
  - `keyword` を `strip` し、空なら `null` 扱い（FR-03）。`null` なら既存の経路をそのまま実行
  - `keyword` ありの場合：`from`/`to` なしは `searchByKeyword(…, Pageable)`、ありは `searchByKeyword(…)` で候補を取得し、既存と同じ重複判定と手動ページングを通す（FR-05）。`category` が `null` のときは `ResourceCategory.values()` を渡す
  - 候補取得部分だけを差し替え、重複判定（`overlaps`）とページング処理は共用して重複コードを増やさない
- [x] **Step 4**（API 層）：`backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` を修正
  - `@RequestParam(required = false) String keyword` を追加し、Service に渡す。Javadoc の `@param` と説明を更新（FR-01）
- [x] **Step 5**（Service の単体テスト）：`backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` に追加（既存テストは変更しない）
  - `list_withKeyword_usesKeywordQueryAndTrimsWhitespace`
  - `list_withBlankKeyword_usesExistingPath`（旧クエリが呼ばれ、新クエリは呼ばれない）
  - `list_withKeywordAndCategoryNull_passesAllCategories`
  - `list_withKeywordAndTimeRange_excludesOccupiedResource`（空き確認の経路に併用）
  - `list_adminWithKeyword_includesInactive` / `list_memberWithKeyword_excludesInactive`
  - 命名規約 `methodName_condition_expectedBehavior`（ADR-018）に従う
- [x] **Step 6**（API の統合テスト）：`backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` に追加（H2 上で JPQL を実際に実行して確認する）
  - 名称のみ一致、説明のみ一致、大文字小文字違い、`description` が NULL で名称一致、一致なしは 0 件
  - `keyword` 未指定・空文字・空白のみ：全件（既存と同じ）
  - カテゴリとの AND、`from`/`to` との AND、MEMBER は inactive の一致を返さない、ADMIN は返す
  - 空白を含むキーワードが分割されない（全体で部分一致）
- [x] **Step 7**（Backend のまとめ）：`cd backend && ./gradlew spotlessApply` で整形し、`./gradlew compileJava compileTestJava` でコンパイルを確認する。テストの実行は Build and Test で行う

### Part C: frontend

- [x] **Step 8**（Server Action）：`frontend/src/server/actions/resources.ts` を修正
  - `ListResourcesParams` に `keyword?: string` を追加し、指定があれば `queryParams.keyword` に詰める（FR-06、FR-07）
- [x] **Step 9**（ページ）：`frontend/src/app/(authenticated)/resources/page.tsx` を修正
  - `SearchParams` に `keyword` を追加し、`listResourcesAction` と `ResourceFilterForm`（`defaultKeyword`）に渡す。`PaginationNav` は `page` 以外のクエリを引き継ぐため変更不要（FR-07）
- [x] **Step 10**（フォーム）：`frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` を修正
  - `defaultKeyword` を props に追加し、キーワード入力欄（`<Label htmlFor="keyword">`、`<Input id="keyword" name="keyword">`）を追加
  - 送信時は前後空白を除去し、空でなければ `keyword` を URL に付ける。空なら付けない（FR-06）
  - 自動化向けに `data-testid="resource-filter-keyword-input"` を付ける（Code Generation の規則）。既存のグリッドの崩れがないよう、キーワード欄は 1 行を占める配置にする
- [x] **Step 11**（frontend のテスト）：`frontend/tests/unit/server/actions/resources.test.ts` に追加
  - `keyword` 指定時に MSW のハンドラが `keyword` クエリを受け取ること、未指定時は付かないこと、`category` との併用

### Part D: 記録

- [x] **Step 12**（Documentation Summary）：`Docs/spec/aidlc-docs/construction/resource-list-filter/code/summary.md` に、変更・追加したファイルの一覧と受入条件との対応を記録する（マークダウンのみ。アプリケーションコードは置かない）

## 対象外（本ステージで作らないもの）

- DB マイグレーション（スキーマ変更なし）、デプロイ成果物、E2E テスト（既存は `example.spec.ts` のみ。課題の対象外）
- テストの実行と、lint・format の検証は Build and Test で行う

## Requirements Traceability

| 要件 | ステップ |
|---|---|
| FR-01、FR-02 | 2、4、6 |
| FR-03、FR-04 | 3、5、6 |
| FR-05 | 3、5、6 |
| FR-06 | 8、10、11 |
| FR-07 | 8、9、11 |
| FR-08 | 2、6 |
| FR-09 | 2 |
| 仕様の更新（Spec-first） | 1 |
| 受入条件 5（既存テスト pass） | 設計方針 1、4（Build and Test で検証） |
| 受入条件 6（BE のユニットテスト追加） | 5、6 |

## 検証上の注意

- backend のテストは H2、本番は PostgreSQL。JPQL の `LOWER` / `LIKE` / `IN` は両方で動く書き方にした。可能なら Build and Test でローカルの PostgreSQL（`docker compose`）に対する手動確認も行う
