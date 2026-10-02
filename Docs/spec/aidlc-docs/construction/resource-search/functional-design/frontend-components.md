# Frontend Components — resource-search

## `ResourceFilterForm`（既存コンポーネント、拡張）

### Props（変更）

| Prop | 型 | 変更内容 |
|---|---|---|
| `defaultCategory` | `string?` | 変更なし |
| `defaultFrom` | `string?` | 変更なし |
| `defaultTo` | `string?` | 変更なし |
| `defaultKeyword` | `string?`（新規） | URL の `keyword` パラメータを初期値として反映 |

### UI 要素の追加

- 既存の `grid-cols-1 sm:grid-cols-3`（カテゴリ／開始日時／終了日時）のグリッドに、キーワード入力欄を追加する（レイアウトは `grid-cols-1 sm:grid-cols-4` に拡張するか、2 行構成にするかは Code Generation 時に既存デザインとの整合性を見て決定する）
- `<Label htmlFor="keyword">キーワード</Label>` + `<Input id="keyword" name="keyword" type="text" placeholder="リソース名・説明で検索" defaultValue={defaultKeyword} />`

### イベント処理（`handleSubmit` の拡張）

```
const keyword = (data.get("keyword") as string).trim();
if (keyword) params.set("keyword", keyword);
```

- 既存の `category`/`from`/`to` と同じ「値があれば `params.set`、なければ何もしない」パターンに従う（BR-02・BR-07 に対応）
- `trim()` により空白のみの入力を未入力として扱う（BR-02）

### `handleReset` への影響

変更なし（`router.push("/resources")` で全パラメータをクリアする既存動作がそのまま `keyword` にも適用される）

## `resources/page.tsx`（既存コンポーネント、拡張）

### `SearchParams` インターフェース（変更）

`keyword?: string` を追加する。

### `listResourcesAction` 呼び出し（変更）

`keyword: params.keyword` を渡す（`server/actions/resources.ts` の `ListResourcesParams` に `keyword?: string` を追加）。

### 空状態メッセージの分岐拡張（US-04 対応）

現状（72〜77行目）:

```tsx
{hasTimeFilter
  ? "指定した時間帯に空きのあるリソースがありません。"
  : "リソースがありません。"}
```

拡張後の方針:

```tsx
{hasKeyword
  ? "絞り込み条件に一致するリソースがありません。"
  : hasTimeFilter
    ? "指定した時間帯に空きのあるリソースがありません。"
    : "リソースがありません。"}
```

- `hasKeyword = Boolean(params.keyword?.trim())` を `hasTimeFilter` と同様の書式で定義する
- keyword が指定されている場合（from/to の有無に関わらず）は「絞り込み条件に一致するリソースがありません。」を優先表示する。category のみ指定時は従来通り「リソースがありません。」のまま（category は「絞り込み」という体感が薄く、既存文言でも違和感がないため変更対象外とする）
- 確定文言は `docs-next/docs/spec/screen-spec.md` §`/resources` にも反映する（`/update-spec` スキルで Code Generation 内に実施）

### `ResourceFilterForm` 呼び出し（変更）

`defaultKeyword={params.keyword}` を追加する。

## `server/actions/resources.ts`（既存 Server Action、拡張）

### `ListResourcesParams`（変更）

```ts
interface ListResourcesParams {
  category?: string;
  from?: string;
  to?: string;
  keyword?: string; // 追加
  page?: number;
  size?: number;
}
```

### `listResourcesAction`（変更）

```ts
if (params?.keyword) queryParams.keyword = params.keyword;
```

既存の `category`/`from`/`to` と同じ「値があればクエリパラメータに含める」パターンに従う（BR-02・BR-07）。

## バリデーション

`keyword` はフリーテキスト検索であり、`CreateResourceSchema`（Zod、登録・更新フォーム用）とは無関係。フィルタフォームはこれまで Zod スキーマを使わず `FormData` を直接読み取る実装のため、本ユニットでも新たな Zod スキーマは導入しない（既存パターンとの一貫性を優先）。
