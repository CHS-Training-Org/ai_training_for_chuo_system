# Code Generation Summary — resource-list-filter（Issue #23）

## 変更ファイル一覧

### backend（修正のみ・新規ファイルなし）

| ファイル | 変更内容 |
|---|---|
| `backend/src/main/java/com/example/bookflow/application/ResourceService.java` | `list()` に `keyword` パラメータを追加。`listWithAvailabilityFilter` を `listFiltered` に改名・拡張し、keyword/from-to のいずれか（または両方）が指定された場合に全候補取得→Java側フィルタ→手動ページネーションの経路に合流させた。`normalizeKeyword`/`matchesKeyword` ヘルパーを追加 |
| `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` | `list()` に `@RequestParam(required = false) String keyword` を追加し `resourceService.list(...)` に渡す |
| `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` | 既存4件の `list(...)` 呼び出しに `keyword` 引数（null）を追加。`ListWithKeyword` ネストクラスを新設し6ケース追加（name一致・description一致・大文字小文字無視・不一致0件・空白キーワード無視・カテゴリとのAND） |
| `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` | シードリソースに `description`（「プロジェクター完備」）を追加。`keyword` のエンドポイントテスト4件を追加（name一致・description一致・不一致・カテゴリとのAND） |

### frontend（修正のみ・新規ファイルなし）

| ファイル | 変更内容 |
|---|---|
| `frontend/src/server/actions/resources.ts` | `ListResourcesParams` に `keyword?: string` を追加し、`listResourcesAction` で `queryParams.keyword` を設定 |
| `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` | `defaultKeyword` prop・キーワード入力欄（`data-testid="resource-filter-keyword-input"`）を追加。`handleSubmit` で `keyword` を URL パラメータに反映。グリッドを4カラムに調整 |
| `frontend/src/app/(authenticated)/resources/page.tsx` | `SearchParams` に `keyword` を追加し、`listResourcesAction`・`ResourceFilterForm` に配線 |
| `frontend/tests/unit/server/actions/resources.test.ts` | 既存の「カテゴリフィルタパラメータを渡せる」と同パターンで「keyword フィルタパラメータを渡せる」ケースを追加 |

### spec（Spec-first、Code Generation Part2着手前に更新済み）

| ファイル | 変更内容 |
|---|---|
| `docs-next/docs/spec/api-spec.md` | `GET /api/resources` に `keyword` クエリパラメータを追記 |
| `docs-next/docs/spec/screen-spec.md` | `/resources` のUI要素表にキーワード検索欄を追記 |
| `docs-next/docs/spec/requirements.md` | UC-02 の機能要件表に `RES-09`（キーワード検索）を追記 |

## 要件トレーサビリティ

| 要件 | 対応するコード変更 |
|---|---|
| RES-01（keyword追加・部分一致） | `ResourceService.matchesKeyword`, `ResourceController.list`, `ResourceServiceTest.ListWithKeyword`, `ResourceControllerTest`（name/description一致ケース） |
| RES-02（大文字小文字無視） | `matchesKeyword`（`Locale.ROOT` での `toLowerCase`）, `list_keywordDifferentCase_matchesIgnoringCase` |
| RES-03（`ResourceFilterForm` にキーワード入力欄・URL反映） | `ResourceFilterForm.tsx`, `resources.ts`, `resources/page.tsx` |
| RES-04（AND条件） | `ResourceService.listFiltered`（keyword→from/to の順に絞り込み）, `list_keywordWithCategory_appliesAndCondition`（両テストクラス） |

## 受入条件との対応

- [x] キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される → `matchesKeyword` + 各テスト
- [x] キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除される → `ResourceFilterForm.handleSubmit`（空値は `URLSearchParams` に設定しない）+ `normalizeKeyword`（空文字列は null 扱い）
- [x] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND 条件） → `list_keywordWithCategory_appliesAndCondition`
- [x] `keyword` パラメータ未指定時の動作は既存と変わらない → `normalizeKeyword(null) == null` により `listPaginated` 経路を維持、既存4テストは引数変更のみで振る舞い不変を確認
- [x] バックエンドの既存テスト（`ResourceServiceTest` 等）が引き続き pass する → `./gradlew test` で確認済み（Build and Test ステージで全体再確認）
- [x] 追加した検索ロジックに対応するユニットテストをバックエンドに追加する → `ListWithKeyword`（6ケース）+ Controller側4ケース

## 設計上の注記

- `keyword` フィルタは DB側（`ILIKE` 等）ではなく Java 側で実装した。これはユーザー指示（既存の `from`/`to` フィルタパターンとの一貫性を優先）による設計方針であり、Reverse Engineering で指摘したスケーラビリティ上の技術的負債（全件取得後フィルタ）を keyword フィルタにも許容する判断である（詳細は `requirements.md` の非機能要件を参照）。
