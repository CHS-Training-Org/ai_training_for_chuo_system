# Code Generation Plan — ユニット: resource-sort（リソース一覧のソート順選択）

## Unit Context

- **Stories implemented**: US-01, US-02, US-03, US-04（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: Issue #23（keyword 検索、PR #132・未マージ）をこのブランチの基点として取り込み済み。`ResourceService#list`・`ResourceController#list` はすでに `keyword` 引数を持つ
- **Database entities owned**: `Resource`（スキーマ変更なし、既存カラムでのソートのみ）
- **Service boundaries**: backend の `application`/`presentation` 層内、frontend の `resources` 画面・BFF 層内に閉じる。**`domain`（`ResourceRepository`）層は変更不要**（後述）

## 技術判断（Functional Design で保留していた実装機構の決定）

- **Repository 層は変更不要**: `listPaginated` 経路が使う全 8 メソッド（`findByIsActiveTrue`・`findByCategoryAndIsActiveTrue`・`findByCategory`・`findAll`・keyword 系 4 メソッドの Page 版）はいずれも既存の `Pageable` 引数を持ち、Spring Data JPA が `Pageable.getSort()` を自動的に `ORDER BY` へ変換する（`@Query` の JPQL にも適用される、既存クエリに `ORDER BY` が無いため問題なく動作）。よって **ソートパラメータの受理・検証・NULL 処理の組み立てはすべて `ResourceController`/`ResourceService` 側のロジックで完結する**
- **シグネチャ変更なし**: `ResourceService#list(category, from, to, keyword, isAdmin, pageable)`・`ResourceController#list(...)` はすでに `Pageable pageable` を引数に持つため、**メソッドシグネチャの変更は不要**。既存の `ResourceServiceTest`・`ResourceControllerTest` の呼び出し箇所もシグネチャ変更の影響を受けない
- **ホワイトリスト検証**: `ResourceController#list` で `pageable.getSort()` の各 `Sort.Order.getProperty()` を `Set.of("name", "capacity", "createdAt")` と照合し、含まれない場合・`asc`/`desc` 以外の方向が指定された場合（Spring の `Sort.Order` は方向を `Direction` enum で保持するため実質発生しないが、念のため）は `ValidationException`（既存の `from`/`to` 同時指定チェックと同じパターン）を throw する
- **デフォルトソート**: `@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC)` に変更し、`sort` 未指定時のリクエストに対して Spring が自動的に `createdAt,asc` を適用する
- **NULL capacity（listPaginated 経路）**: `ResourceService` 内で、`pageable.getSort()` の各 `Sort.Order` のうち `property` が `"capacity"` のものだけを `.nullsLast()`（`Sort.Order` のメソッド。`NullHandling.NULLS_LAST` を明示する）に差し替えた新しい `Sort` を組み立て、`PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), adjustedSort)` で新しい `Pageable` を作り、既存の repository 呼び出しに渡す
- **NULL capacity（listWithAvailabilityFilter 経路）**: `pageable.getSort()` から `Comparator<Resource>` を組み立てるヘルパーメソッドを `ResourceService` に追加する。`capacity` は `Comparator.nullsLast(...)` でラップし、昇順・降順いずれでも NULL が最後に来るよう、方向は nullsLast でラップする**前**の内側の比較器に適用する（`reversed()` を外側にかけると nulls の位置まで反転してしまうため、この順序を厳守する）。`name`・`createdAt` は通常の `Comparator.comparing(...)` に `.reversed()`（降順時）を適用する
- **複数ソート指定への対応**: UI は単一フィールドしか送信しないが、直接 API 呼び出しで複数の `sort` パラメータが送られた場合も壊れないよう、`Sort` の全 `Order` を走査して `thenComparing` で連結する（過剰実装ではなく、`Sort` 型を正しく扱うための自然な実装）

## 実行ステップ

- [x] **Step 1: 仕様書更新（Spec-first）**
  - `/update-spec` スキルで `docs-next/docs/spec/api-spec.md`（`GET /api/resources` に `sort` パラメータ追記、許可フィールド・デフォルト値・不正値時の 400 を明記）・`docs-next/docs/spec/screen-spec.md`（`/resources` のソート選択 UI 追記）を更新する
  - Story mapping: 全ストーリー（仕様の前提となるドキュメント更新）

- [x] **Step 2: Business Logic 層生成**
  - `ResourceService` に、`Sort` の `capacity` オーダーを `nullsLast()` に差し替えて新しい `Pageable` を組み立てる private ヘルパー（例: `applyCapacityNullsLast(Pageable)`）を追加
  - `ResourceService` に、`Sort` から `Comparator<Resource>` を組み立てる private ヘルパー（例: `buildComparator(Sort)`）を追加
  - `listPaginated` 内の各 repository 呼び出しに、上記ヘルパーで変換した `Pageable` を渡すよう変更
  - `fetchAllCandidates` の呼び出し元（`listWithAvailabilityFilter`）で、候補リスト取得後・手動ページネーション前に `candidates.sort(comparator)` を適用するよう変更
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 3: Business Logic 層ユニットテスト**
  - 既存の `resourceService.list(...)` 呼び出し箇所はシグネチャ変更がないため修正不要
  - 新規テスト追加：`capacity` 昇順/降順指定時に repository へ渡される `Pageable` の `Sort` が `nullsLast` になっていることの検証、`listWithAvailabilityFilter` 経路で `Comparator` によるソートが候補リストに適用されることの検証（`name`・`capacity`・`createdAt` それぞれ）、複数 `Sort.Order` 指定時の `thenComparing` 連結の検証
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 4: API 層生成**
  - `ResourceController#list` の `@PageableDefault` を `@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC)` に変更
  - `pageable.getSort()` の各 `Sort.Order.getProperty()` を許可フィールド（`name`/`capacity`/`createdAt`）と照合し、不一致があれば `ValidationException` を throw するチェックを追加
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 5: API 層ユニットテスト**
  - `ResourceControllerTest` に、H2 実データに対する name/capacity 昇順・降順、NULL capacity が常に末尾であること、`sort` 未指定時のデフォルト（`createdAt,asc`）、不正な `sort` 値での 400、category/from-to/keyword との組み合わせでソートが維持されることの統合テストを追加
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 6: Backend 層サマリ**
  - backend 側の変更点を `Docs/spec/aidlc-docs/construction/resource-sort/code/backend-summary.md` に記録

- [x] **Step 7: Frontend Components 生成**
  - `frontend/src/server/actions/resources.ts`: `ListResourcesParams`/`listResourcesAction` に `sort` 追加
  - `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`: `defaultSort` prop・ソート選択 `Select`（5 選択肢）・`handleSubmit` への反映（グリッドを `sm:grid-cols-5` に拡張）
  - `frontend/src/app/(authenticated)/resources/page.tsx`: `SearchParams.sort`・`listResourcesAction` 呼び出し・`ResourceFilterForm` 呼び出しへの `defaultSort` 追加
  - `data-testid`: `resource-filter-form-sort-select`（Issue #23 の `resource-filter-form-keyword-input` と同じ命名規約）
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 8: Frontend Components ユニットテスト**
  - `frontend/tests/unit/server/actions/resources.test.ts` に `sort` パラメータ中継・未指定時の非混入のテストケースを追加
  - Story mapping: US-01

- [x] **Step 9: Frontend 層サマリ**
  - frontend 側の変更点を `Docs/spec/aidlc-docs/construction/resource-sort/code/frontend-summary.md` に記録

## スコープ外（本プランに含めない）

- データベースマイグレーション（スキーマ変更不要のため対象外）
- `ResourceRepository`（`domain` 層）の変更（上記「技術判断」のとおり不要）
- E2E テスト（`requirements.md` のスコープに明記なし、既存方針を踏襲）

## 本プランが Code Generation の唯一の正とする

本ステップ順序・内容が Part 2（Generation）実行の単一の正とする。逸脱する場合は本ファイルを更新してから実行する。
