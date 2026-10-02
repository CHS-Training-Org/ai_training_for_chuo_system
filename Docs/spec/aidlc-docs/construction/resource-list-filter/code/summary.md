# Code Generation Summary — resource-list-filter

## 変更ファイル一覧

### Backend（Modified）

- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` — 派生クエリメソッド6本を削除し、`@Query` カスタムJPQLの `search`（ページ版・全件版）に統一
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java` — `list` に `keyword` 引数を追加、`prepareKeyword`（trim・空文字判定・ワイルドカードエスケープ）を追加、内部実装を新 `search` メソッド呼び出しに統一
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` — `keyword` クエリパラメータ受付、100文字超過時の `ValidationException`

### Backend（Tests, Modified）

- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` — 既存4テストのスタブを `search(...)` に更新。`PrepareKeyword` ネストクラス（4テスト）・`list_withKeyword_passesPreparedKeywordToRepository`（1テスト）を追加
- `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` — キーワード検証用 seed リソース（`KEYWORD_RESOURCE_ID`）を追加。6件の新規結合テストを追加

### Frontend（Modified）

- `frontend/src/server/actions/resources.ts` — `ListResourcesParams` に `keyword?: string` を追加
- `frontend/src/app/(authenticated)/resources/page.tsx` — `SearchParams` に `keyword?: string` を追加し `listResourcesAction`・`ResourceFilterForm` へ伝播
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` — キーワード入力欄を追加（`label` 付き、`maxLength=100`）

### Frontend（Tests, Modified）

- `frontend/tests/unit/server/actions/resources.test.ts` — 「正常時: キーワードフィルタパラメータを渡せる」テストケースを追加

## テスト結果

| コマンド | 結果 |
|---|---|
| `cd backend && ./gradlew test` | BUILD SUCCESSFUL（`ResourceServiceTest` 27件・`ResourceControllerTest` 27件を含む全テスト pass） |
| `cd backend && ./gradlew spotlessCheck checkstyleMain` | BUILD SUCCESSFUL（既存の無関係な警告2件のみ。エラーなし） |
| `cd frontend && pnpm test` | 10 ファイル・81テスト全て pass |
| `cd frontend && pnpm lint` | エラーなし |
| `cd frontend && pnpm format:check` | 全79ファイルがフォーマット済み |
| `cd frontend && npx tsc --noEmit` | 型エラーなし |

## 設計からの差分・補足

- NFR Design で「既存メソッドと並存 or 置き換えは Code Generation 時に判断」としていた点について、既存の派生クエリメソッド6本は `ResourceService` 以外から参照されていないことを確認したうえで削除し、新しい `search` メソッドに完全統一した（既存テストのスタブ更新を伴う）
- `data-testid` 属性は付与していない。本リポジトリの既存コードに `data-testid` を使う慣行がなく（E2Eテストも `resources` 配下は未整備）、本タスクだけ新しい命名規約を持ち込むと一貫性を損なうため、既存の `label`/`htmlFor` パターンのみを踏襲した
