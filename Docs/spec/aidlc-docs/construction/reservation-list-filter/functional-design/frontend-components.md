# Frontend Components — reservation-list-filter

## `ReservationFilterForm`（新規コンポーネント）

`resources/ResourceFilterForm.tsx` と同じパターン（Client Component、`FormData` から値取得、trim・センチネル値で「未指定」を表現、`router.push` で URL 更新）を踏襲する。

### Props

| Prop | 型 | 説明 |
|---|---|---|
| `defaultResourceName` | `string?` | URL の `resourceName` パラメータを初期値として反映 |
| `defaultFrom` | `string?` | URL の `from` パラメータを初期値として反映 |
| `defaultTo` | `string?` | URL の `to` パラメータを初期値として反映 |

### 既存のステータスタブとの関係（重要な設計判断）

既存のステータスタブは `<Link href="/reservations?status=...">` による独立したナビゲーションであり、`ReservationFilterForm` には `status` の入力要素を含めない。そのため `handleSubmit` では `useSearchParams()` で**現在選択中の `status` 値（複数可）を読み取り、新しい `URLSearchParams` に転記してから** `resourceName`/`from`/`to` を追加する（これを怠るとフィルタ送信時に選択中のステータスタブが失われてしまう）。

### イベント処理（`handleSubmit`）

```
const params = new URLSearchParams();
const currentStatus = searchParams.getAll("status");
for (const s of currentStatus) params.append("status", s);

const resourceName = (data.get("resourceName") as string).trim();
const from = data.get("from") as string;
const to = data.get("to") as string;

if (resourceName) params.set("resourceName", resourceName);
if (from) params.set("from", from);
if (to) params.set("to", to);

router.push(`/reservations?${params.toString()}`);
```

- 既存の `category`/`keyword` と同じ「値があれば `params.set`、なければ何もしない」パターンに従う（BR-02 に対応）
- `trim()` により空白のみの入力を未入力として扱う（BR-02）

### `handleReset` の挙動

`resourceName`・`from`・`to` のみを解除し、**現在選択中のステータスタブは維持する**（ステータスのリセットは既存の「すべて」タブが別途担っており、役割を分離する）。

```
const params = new URLSearchParams();
const currentStatus = searchParams.getAll("status");
for (const s of currentStatus) params.append("status", s);
router.push(`/reservations?${params.toString()}`);
```

### `data-testid` 命名

既存の `resource-filter-form-keyword-input` 等と同じ規約（`{domain}-filter-form-{field}-{element}`）：`reservation-filter-form-resource-name-input`・`reservation-filter-form-from-input`・`reservation-filter-form-to-input`

## `reservations/page.tsx`（既存コンポーネント、拡張）

### `searchParams` の読み取り（変更）

`resourceName`・`from`・`to` を読み取り、`listReservationsAction` 呼び出しに追加する。

### `ReservationFilterForm` 呼び出し（新規）

ステータスタブの直後に配置し、`defaultResourceName={sp.resourceName}`・`defaultFrom={sp.from}`・`defaultTo={sp.to}` を渡す。

### `PaginationNav` への影響

変更不要。`query={sp}` が searchParams オブジェクトをそのまま引き継ぐ実装のため、`resourceName`/`from`/`to` もページネーションリンクに自動的に継承される。

## `server/actions/reservations.ts`（既存 Server Action、拡張）

### `ListReservationsParams`（変更）

```ts
interface ListReservationsParams {
  status?: string[];
  resourceName?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
```

### `listReservationsAction`（変更）

```ts
if (params?.resourceName) queryParams.resourceName = params.resourceName;
if (params?.from) queryParams.from = toIsoWithSeconds(params.from);
if (params?.to) queryParams.to = toIsoWithSeconds(params.to);
```

既存の `toIsoWithSeconds` ヘルパー（datetime-local の16文字入力を秒付きISOへ正規化）をそのまま流用する。

## バリデーション

`resourceName`/`from`/`to` はフリーテキスト・日時入力であり、既存の `CreateReservationSchema` 等とは無関係。フィルタフォームは既存パターン同様 Zod スキーマを使わず `FormData` を直接読み取る実装のため、本ユニットでも新たな Zod スキーマは導入しない。
