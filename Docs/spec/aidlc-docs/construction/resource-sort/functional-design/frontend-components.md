# Frontend Components — resource-sort

## `ResourceFilterForm`（既存コンポーネント、拡張）

### Props（変更）

| Prop | 型 | 変更内容 |
|---|---|---|
| `defaultCategory` | `string?` | 変更なし |
| `defaultFrom` | `string?` | 変更なし |
| `defaultTo` | `string?` | 変更なし |
| `defaultKeyword` | `string?` | 変更なし |
| `defaultSort` | `string?`（新規） | URL の `sort` パラメータを初期値として反映 |

### UI 要素の追加

- 既存の `grid-cols-1 sm:grid-cols-4`（カテゴリ／開始日時／終了日時／キーワード）のグリッドに、ソート選択欄を追加する（`grid-cols-1 sm:grid-cols-5` に拡張する。既存の `category` Select と同じ UI パターン）
- `<Label htmlFor="sort">並び順</Label>` + `<Select name="sort" defaultValue={defaultSort ?? "DEFAULT"}>` で以下 5 選択肢を提供する：
  - `DEFAULT`: 「登録日時順（デフォルト）」
  - `name,asc`: 「名称順（昇順）」
  - `name,desc`: 「名称順（降順）」
  - `capacity,asc`: 「定員順（昇順）」
  - `capacity,desc`: 「定員順（降順）」
- 選択肢の value はバックエンドの Spring `Pageable` が解釈する `sort=<field>,<asc|desc>` 形式をそのまま使う（`DEFAULT` のみ特殊な内部値で、送信時は `sort` パラメータ自体を付与しない）

### イベント処理（`handleSubmit` の拡張）

```
const sort = data.get("sort") as string;
if (sort && sort !== "DEFAULT") params.set("sort", sort);
```

- 既存の `category`（`"ALL"` を除外する）と同じ「センチネル値は未指定として扱う」パターンに従う（BR-02・BR-07 に対応）
- 他のパラメータ変更時と同様、`handleSubmit` は常に新しい `URLSearchParams` を組み立てて `router.push` するため、ソート変更時もページネーションは自然に 1 ページ目にリセットされる（追加実装不要）

### `handleReset` への影響

変更なし（`router.push("/resources")` で全パラメータをクリアする既存動作がそのまま `sort` にも適用される）

## `resources/page.tsx`（既存コンポーネント、拡張）

### `SearchParams` インターフェース（変更）

`sort?: string` を追加する。

### `listResourcesAction` 呼び出し（変更）

`sort: params.sort` を渡す（`server/actions/resources.ts` の `ListResourcesParams` に `sort?: string` を追加）。

### `ResourceFilterForm` 呼び出し（変更）

`defaultSort={params.sort}` を追加する。

### `PaginationNav` への影響

変更不要。`query={params}` が `searchParams` オブジェクトをそのまま引き継ぐ実装のため、`sort` もページネーションリンクに自動的に継承される（Issue #23 で `keyword` を追加したときと同じパターン）。

## `server/actions/resources.ts`（既存 Server Action、拡張）

### `ListResourcesParams`（変更）

```ts
interface ListResourcesParams {
  category?: string;
  from?: string;
  to?: string;
  keyword?: string;
  sort?: string; // 追加
  page?: number;
  size?: number;
}
```

### `listResourcesAction`（変更）

```ts
if (params?.sort) queryParams.sort = params.sort;
```

既存の `category`/`from`/`to`/`keyword` と同じ「値があればクエリパラメータに含める」パターンに従う（BR-02・BR-07）。

## バリデーション

`sort` はドロップダウンの固定選択肢からのみ値が送信されるため、フロントエンド側で追加のバリデーションは行わない（不正値はバックエンドの BR-01 で 400 として扱う。これは直接 API を呼び出すクライアントに対する防御であり、UI からの通常操作では到達しない）。
