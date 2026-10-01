---
type: working-doc
title: Code Generation Plan（ユニット: resource-list-filter）
description: AI-DLC Code Generation ステージの実行計画（Part 1 Planning）
timestamp: 2026-10-01
---

# Code Generation Plan — resource-list-filter

## ユニットコンテキスト

- **実装する要件**: RES-01〜04（= `requirements.md` RES-09）。詳細は `Docs/spec/aidlc-docs/inception/requirements/requirements.md`
- **設計根拠**: `Docs/spec/aidlc-docs/construction/resource-list-filter/functional-design/` 配下の4ファイル
- **依存関係**: なし（他ユニット・他サービスへの依存なし）
- **影響するレイヤー**: backend（domain/application/presentation）、frontend（画面・Server Action）
- **本計画が実装の唯一の正**（Single Source of Truth）

## ステップ一覧

### Repository層

- [x] **Step 1: Repository Layer Generation** — `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` を修正する
  - 既存の派生クエリメソッド6種（`findByIsActiveTrue`×2、`findByCategoryAndIsActiveTrue`×2、`findByCategory`×2）を削除する
  - `@Query` による `search(category, isActiveOnly, pattern, pageable): Page<Resource>` を追加する
  - `@Query` による `search(category, isActiveOnly, pattern): List<Resource>` を追加する（`fetchAllCandidates` 用）
  - JPQL条件: `(:category IS NULL OR r.category = :category) AND (:isActiveOnly = false OR r.isActive = true) AND (LOWER(r.name) LIKE :pattern OR LOWER(COALESCE(r.description, '')) LIKE :pattern)`
  - `findByIdForUpdate`（悲観ロック）は変更しない
- [x] **Step 1 完了確認**: `ResourceRepository.java` 以外のファイルから旧6メソッドへの参照が残っていないことを確認する（grepで確認済み）

### Service層

- [x] **Step 2: Business Logic Generation** — `backend/src/main/java/com/example/bookflow/application/ResourceService.java` を修正する
  - `list`・`listPaginated`・`listWithAvailabilityFilter`・`fetchAllCandidates` のシグネチャに `String keyword` パラメータを追加する
  - `private static String toLikePattern(String keyword)` を追加する：`keyword` が `null`/空白のみなら `"%%"`、それ以外は `trim().toLowerCase()` を `%...%` で包む
  - `listPaginated`・`fetchAllCandidates` 内の派生クエリ呼び出しを `resourceRepository.search(category, !isAdmin, pattern, pageable)` / `resourceRepository.search(category, !isAdmin, pattern)` に置き換える
- [x] **Step 3: Business Logic Unit Testing** — `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` を修正する
  - 既存の `List_` ネストクラスのモック対象を `resourceRepository.findByIsActiveTrue(...)` 等から `resourceRepository.search(...)` に置き換える（アサーション内容は変更しない）
  - `toLikePattern` の単体テストを追加する（`@Nested class ToLikePattern`）：null→`"%%"`、空白のみ→`"%%"`、通常文字列→trim+lowercase+`%...%`
  - `list` にキーワードを渡した場合に `search` が期待する `pattern` 引数で呼ばれることを検証するテストを追加する

### Presentation層

- [x] **Step 4: API Layer Generation** — `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` を修正する
  - `list` メソッドに `@RequestParam(required = false) String keyword` を追加し、`resourceService.list(...)` にそのまま渡す
- [x] **Step 5: API Layer Unit Testing** — `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` を修正する
  - `@BeforeEach` のシードデータに、説明文でのマッチを検証できるリソースを1件追加した（`PROJECTOR_RESOURCE_ID`、名称に含まれない語を`description`に含める）
  - 以下のシナリオをテストした：キーワードで名称一致、説明一致、大文字小文字非区別、該当なし、カテゴリ・期間フィルタとのAND条件、`keyword`未指定時は既存動作を維持
  - `@AfterEach` のシードデータ削除に追加したリソースのDELETE文を加えた

### Frontend

- [x] **Step 6: Frontend Components Generation** — 以下の3ファイルを修正した
  - `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`：`defaultKeyword` prop、キーワード入力欄（グリッドを`sm:grid-cols-4`に変更）、URL組み立てロジックを `buildResourceFilterParams(data: FormData): URLSearchParams` という純関数に切り出した
  - `frontend/src/app/(authenticated)/resources/page.tsx`：`SearchParams` に `keyword?: string` を追加、`listResourcesAction`・`ResourceFilterForm` への伝播
  - `frontend/src/server/actions/resources.ts`：`ListResourcesParams` に `keyword?: string` を追加、`queryParams.keyword` への反映
  - 新規入力要素には `data-testid="resource-filter-keyword-input"` を付与した（自動化対応ルール）
- [x] **Step 7: Frontend Components Unit Testing**
  - 新規ファイル `frontend/tests/unit/resource-filter-form.test.ts` を作成し、`buildResourceFilterParams` を検証した（keyword付与、空欄で除外、trim、category=ALL除外、複合条件、全空）
  - `frontend/tests/unit/server/actions/resources.test.ts` に、`keyword` パラメータを渡せることを確認するテストケースを追加した

### ドキュメント・マイグレーション・デプロイ

- [x] **Step 8: Documentation**（完了済み）— `api-spec.md`・`screen-spec.md`・`requirements.md` は `/update-spec` で更新済み。本ステップでの追加作業なし
- [x] **Step 9: Database Migration** — 対象外（スキーマ変更なし、Functional Design `domain-entities.md` で確認済み）
- [x] **Step 10: Deployment Artifacts** — 対象外（インフラ変更なし）

## 実行結果

- バックエンド：`./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"` 全pass（ResourceServiceTest: Overlaps 7・Availability 4・List_ 6・ToLikePattern 4・Get 2、ResourceControllerTest: 27件）。`spotlessCheck`・`checkstyleMain`・`checkstyleTest` もクリーン
- フロントエンド：`pnpm test resources resource-filter-form` 全pass（resources.test.ts 12件・resource-filter-form.test.ts 7件）。`pnpm lint`・`pnpm format:check` もクリーン

## 完了条件

- 全ステップが [x] になっている
- `./gradlew test`（backend）・`pnpm test`（frontend）がすべて pass する（Build and Testステージで検証）
