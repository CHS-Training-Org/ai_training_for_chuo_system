# Frontend Summary — resource-sort

## 変更ファイル（すべて既存ファイルの修正、新規ファイルなし）

- `frontend/src/server/actions/resources.ts`
  - `ListResourcesParams` に `sort?: string` を追加
  - `listResourcesAction` で既存の `category`/`from`/`to`/`keyword` と同じ「値があればクエリパラメータに含める」パターンに従い `sort` を中継
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`
  - `defaultSort?: string` prop を追加
  - グリッドを `sm:grid-cols-4` → `sm:grid-cols-5` に拡張し、並び順 `Select`（`data-testid="resource-filter-form-sort-select"`）を追加。選択肢は「登録日時順（デフォルト）」「名称順（昇順/降順）」「定員順（昇順/降順）」の 5 つ
  - デフォルト選択肢は内部センチネル値 `"DEFAULT"` とし、`handleSubmit` で `sort !== "DEFAULT"` のときのみ URL パラメータに含める（BR-02・BR-07）
  - `handleReset` は変更なし（既存の全パラメータクリア動作がそのまま適用される）
- `frontend/src/app/(authenticated)/resources/page.tsx`
  - `SearchParams` に `sort?: string` を追加し、`listResourcesAction` 呼び出しに `sort: params.sort` を渡す
  - `ResourceFilterForm` に `defaultSort={params.sort}` を追加
  - `PaginationNav` への `query` は既存どおり `searchParams` をそのまま渡しているため、`sort` もページネーションリンクに自動的に引き継がれる（変更不要）

## テスト

- `frontend/tests/unit/server/actions/resources.test.ts`
  - `listResourcesAction` に `sort` パラメータを渡せることを確認するテストを追加
  - `sort` 未指定時にクエリパラメータへ `sort` キー自体が含まれないことを確認するテストを追加（BR-02・BR-07：後方互換性）

## 実行結果

- `pnpm lint`：エラーなし
- `pnpm format` / `pnpm format:check`：差分なし
- `pnpm test resources`：15 件全成功（既存 13 件 + 新規 2 件）
- `pnpm build`：型チェック含めビルド成功（`/resources` ルート含む全 13 ルート生成成功、exit code 0）

## スコープ外

- `frontend/tests/e2e/`：Code Generation Plan のスコープ外（`requirements.md` に明記済み）
