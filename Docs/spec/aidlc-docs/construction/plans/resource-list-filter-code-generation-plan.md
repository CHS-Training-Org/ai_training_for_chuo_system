# Code Generation Plan — Unit: resource-list-filter

> このプランが Code Generation の単一の真実の源である。Part 2 はこのプランの手順どおりにのみ実行する。

## Unit Context

- **Unit**: `resource-list-filter`（Units Generation は SKIP のため、本課題全体を単一 unit として扱う）
- **対象タスク**: `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（Issue #23）
- **Stories**: なし（User Stories ステージは SKIP。`requirements.md` の Functional Requirements RES-01〜04・User Scenarios を実装対象とする）
- **Dependencies on other units/services**: なし（既存の `ResourceService`/`ResourceRepository`/`ResourceFilterForm` 以外への依存はない）
- **Expected interfaces and contracts**:
  - `GET /api/resources` に任意パラメータ `keyword: string` を追加（後方互換）
  - `ResourceRepository` へのインターフェース変更なし
- **Database entities owned by this unit**: なし（`resources` テーブルの新規カラム・マイグレーションは不要）
- **Service boundaries and responsibilities**: `ResourceService` が `keyword` によるフィルタリング責務を持つ（DB側ではなく Java 側、`requirements.md` の設計方針に基づく）

## Workspace Root / Project Type

- **Workspace Root**: `/workspace`（`Docs/spec/aidlc-state.md` より）
- **Project Type**: Brownfield
- **Code Location**: 既存構造をそのまま使用（`backend/src/main/java/com/example/bookflow/...`、`frontend/src/...`）。新規ディレクトリ作成はない。

## Reverse Engineering 参照（既存ファイル、変更対象）

`Docs/spec/aidlc-docs/inception/reverse-engineering/code-structure.md` より:

- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java`
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java`
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`
- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`
- `frontend/src/app/(authenticated)/resources/page.tsx`
- `frontend/src/server/actions/resources.ts`
- `frontend/tests/unit/server/actions/resources.test.ts`
- `frontend/tests/unit/msw/handlers.ts`

すべて既存ファイルの修正であり、新規ファイル作成は発生しない。

---

## Steps

### Step 1: Spec Update（`/update-spec`） [x]

- [x] `/update-spec` スキルを起動し、以下を Code Generation Part 2 着手前に更新する:
  - `docs-next/docs/spec/api-spec.md` §`GET /api/resources`：`keyword` クエリパラメータ（任意、`name`/`description` への大文字小文字を区別しない部分一致、既存フィルタとAND）を追記済み
  - `docs-next/docs/spec/screen-spec.md` §`/resources`：フィルタフォームへのキーワード入力欄の追記済み
  - `docs-next/docs/spec/requirements.md` §UC-02：`RES-09`（要求シートの `RES-01`〜`04` はシート内ローカル採番のため、requirements.md 本体の既存 `RES-01`〜`08` と衝突しないよう `RES-09` として追加）を追記済み
  - `cd docs-next && npm run build` で確認済み（`onBrokenLinks`/`onBrokenAnchors` エラーなし、`[SUCCESS]`）
- **Story mapping**: RES-01, RES-02, RES-03, RES-04（要件の文書化）

### Step 2: Business Logic Generation（backend: `ResourceService.java`） [x]

- [x] `ResourceService.list(...)` に `String keyword` パラメータを追加した。
- [x] `keyword` が指定された場合（`normalizeKeyword` で空文字列はトリム後 null 扱い）、`listPaginated` ではなく `listFiltered`（旧 `listWithAvailabilityFilter` を改名・拡張）の「全候補取得 → Java側フィルタ → 手動ページネーション」経路に合流させた（`from`/`to` 未指定でも `keyword` があればこの経路を通る）。
- [x] `matchesKeyword` ヘルパーで `name`/`description` への大文字小文字無視の部分一致フィルタを追加した（`description` が `null` の場合は名前のみで判定）。
- [x] `from`/`to` の占有判定フィルタと `keyword` フィルタを `listFiltered` 内で順次適用し AND 条件で両立させた。
- [x] Javadoc を更新し、`keyword` の挙動と設計判断（DB側ではなくアプリケーション側でフィルタする理由）を記載した。
- **Story mapping**: RES-01, RES-02, RES-04

### Step 3: Business Logic Unit Testing（backend: `ResourceServiceTest.java`） [x]

- [x] `keyword` 単独指定（name一致・description一致それぞれ）で絞り込まれるケースを追加した。
- [x] `keyword` が大文字・小文字違いでもマッチすることを検証するケースを追加した。
- [x] `keyword` 未指定・空白のみの場合に既存の全件取得動作が変わらないことを検証するケース（回帰）を追加した。
- [x] `keyword` とカテゴリフィルタを同時指定した AND 条件のケースを追加した。
- [x] `keyword` に合致するリソースが0件の場合の空リスト返却を検証するケースを追加した。
- **Story mapping**: RES-01, RES-02, RES-04, 受入条件（すべて）

### Step 4: API Layer Generation（backend: `ResourceController.java`） [x]

- [x] `list(...)` メソッドに `@RequestParam(required = false) String keyword` を追加し、`resourceService.list(...)` に渡した。
- [x] Javadoc の `@param` に `keyword` を追記した。
- **Story mapping**: RES-01, RES-03

### Step 5: API Layer Unit Testing（backend: `ResourceControllerTest.java`） [x]

- [x] `GET /api/resources?keyword=...` のエンドポイントレベルのテストケース（name一致・description一致・不一致・カテゴリとのAND）を追加した（既存の `@SpringBootTest` + H2 の統合テストパターンに従う）。
- [x] シード資源に `description`（「プロジェクター完備」）を追加し、description 一致テストを可能にした。
- **Story mapping**: RES-01, RES-04, 受入条件（バックエンドの既存テストが引き続き pass する / 追加テスト）

### Step 6: Frontend Components Generation [x]

- [x] `frontend/src/server/actions/resources.ts`：`ListResourcesParams` インターフェースに `keyword?: string` を追加し、`listResourcesAction` で `queryParams.keyword` を設定する処理を追加した。
- [x] `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`：
  - `ResourceFilterFormProps` に `defaultKeyword?: string` を追加した。
  - フォームにキーワード入力欄（`Input`、`name="keyword"`、`data-testid="resource-filter-keyword-input"`）を追加した（グリッドを `sm:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-4` に調整）。
  - `handleSubmit` で `keyword` を `FormData` から取得し、値がある場合のみ `URLSearchParams` に設定した（既存の `category`/`from`/`to` と同じパターン）。
- [x] `frontend/src/app/(authenticated)/resources/page.tsx`：
  - `SearchParams` インターフェースに `keyword?: string` を追加した。
  - `listResourcesAction` 呼び出しに `keyword: params.keyword` を渡した。
  - `ResourceFilterForm` に `defaultKeyword={params.keyword}` を渡した。
- **Story mapping**: RES-03, RES-04

### Step 7: Frontend Components Unit Testing [x]

- [x] **plan修正**：当初案の `msw/handlers.ts` 更新（keyword によるモックデータのフィルタ実装）は見送った。既存の `category` フィルタパラメータのテスト（`resources.test.ts`）を確認した結果、MSW ハンドラはクエリパラメータの値によらず同一レスポンスを返し、パラメータ検証はBE側の責務としてテスト対象外にする規約だったため、これに合わせた。
- [x] `frontend/tests/unit/server/actions/resources.test.ts`：既存の「カテゴリフィルタパラメータを渡せる」ケースと同じパターンで「keyword フィルタパラメータを渡せる」ケースを追加した。
- **Story mapping**: RES-03, RES-04

### Step 8: Documentation Summary [x]

- [x] `Docs/spec/aidlc-docs/construction/resource-list-filter/code/summary.md` に、変更ファイル一覧・要件トレーサビリティ（RES-01〜04・RES-09 と対応するコード変更）を記録した。
- **Story mapping**: 全要件のトレーサビリティ記録

---

## 完了基準（Completion Criteria）

- 上記 Step 1〜8 がすべて `[x]` になっている
- `requirements.md` の受入条件6件をすべて満たしている
- `backend`・`frontend` の既存テストスイートが引き続き pass する（Build and Test ステージで検証）
