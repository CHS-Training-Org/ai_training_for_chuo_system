# Frontend Summary — resource-search

## 変更ファイル（すべて既存ファイルの修正、新規ファイルなし）

- `frontend/src/server/actions/resources.ts`
  - `ListResourcesParams` に `keyword?: string` を追加
  - `listResourcesAction` で既存の `category`/`from`/`to` と同じ「値があればクエリパラメータに含める」パターンに従い `keyword` を中継
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`
  - `defaultKeyword?: string` prop を追加
  - グリッドを `sm:grid-cols-3` → `sm:grid-cols-4` に拡張し、キーワード入力欄（`<Input id="keyword" name="keyword">`、`data-testid="resource-filter-form-keyword-input"`）を追加
  - `handleSubmit` で `keyword` を trim し、値があれば URL パラメータに設定（空白のみの入力は未指定として扱う。BR-02）
  - `handleReset` は変更なし（既存の全パラメータクリア動作がそのまま適用される）
- `frontend/src/app/(authenticated)/resources/page.tsx`
  - `SearchParams` に `keyword?: string` を追加し、`listResourcesAction` 呼び出しに `keyword: params.keyword` を渡す
  - `hasKeyword = Boolean(params.keyword?.trim())` を追加し、`ResourceFilterForm` に `defaultKeyword={params.keyword}` を渡す
  - 0 件時の空状態メッセージを `hasKeyword` 優先の 3 分岐に拡張（keyword 指定時「絞り込み条件に一致するリソースがありません。」／from・to のみ「指定した時間帯に空きのあるリソースがありません。」／いずれもなし「リソースがありません。」）
  - `PaginationNav` への `query` は既存どおり `searchParams` をそのまま渡しているため、keyword もページネーションリンクに自動的に引き継がれる（変更不要）

## テスト

- `frontend/tests/unit/server/actions/resources.test.ts`
  - `listResourcesAction` に keyword パラメータを渡せることを確認するテストを追加
  - keyword 未指定時にクエリパラメータへ `keyword` キー自体が含まれないことを確認するテストを追加（BR-07：後方互換性）

## 実行結果

- `pnpm lint`：エラーなし
- `pnpm format:check`：差分なし
- `pnpm test resources`：13 件全成功（既存 11 件 + 新規 2 件）
- `pnpm build`：型チェック含めビルド成功（`/resources` ルート含む全 13 ルート生成成功）

## スコープ外

- `frontend/tests/e2e/`：Code Generation Plan のスコープ外（`requirements.md` 明記済み）
