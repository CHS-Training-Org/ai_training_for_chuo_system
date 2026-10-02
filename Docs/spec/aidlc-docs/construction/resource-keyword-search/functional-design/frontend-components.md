# Frontend Components — `resource-keyword-search`

新規コンポーネントは作らない。既存の3ファイルに `keyword` を通す。

## コンポーネント階層

```
ResourcesPage（Server Component）
├── ResourceFilterForm（Client Component）  ← キーワード入力欄を追加
├── リソースカード一覧（Server Component 内のレンダリング）
└── PaginationNav（Client Component）       ← 変更なし（query をそのまま引き継ぐ）
```

## `ResourcesPage`（`src/app/(authenticated)/resources/page.tsx`）

Server Component。`searchParams` を読み、Server Action に渡す。

**変更点**

| 項目 | 現在 | 変更後 |
|---|---|---|
| `SearchParams` 型 | `category` / `from` / `to` / `page` | `keyword` を追加 |
| `listResourcesAction` の引数 | `category` / `from` / `to` / `page` | `keyword` を追加 |
| `ResourceFilterForm` の props | `defaultCategory` / `defaultFrom` / `defaultTo` | `defaultKeyword` を追加 |

`PaginationNav` には現在も `query={params}` として `searchParams` 全体を渡しているため、`keyword` は自動的に引き継がれる。**追加の変更を要しない**（AC-07-1）。

## `ResourceFilterForm`（`src/app/(authenticated)/resources/ResourceFilterForm.tsx`）

Client Component。フォーム送信で URL を更新する。

### props

| props | 型 | 追加/既存 | 説明 |
|---|---|---|---|
| `defaultCategory` | `string \| undefined` | 既存 | |
| `defaultFrom` | `string \| undefined` | 既存 | |
| `defaultTo` | `string \| undefined` | 既存 | |
| `defaultKeyword` | `string \| undefined` | **追加** | URL から復元したキーワード |

### 状態管理

クライアント状態は持たない。入力値は非制御コンポーネント（`defaultValue` + `FormData`）として扱う。既存のカテゴリ・期間の各項目と同じ方式であり、Zustand も `useState` も導入しない（NFR-06）。

### ユーザー操作の流れ

| 操作 | 振る舞い | 対応 AC |
|---|---|---|
| キーワードを入力して「絞り込む」 | `FormData` から `keyword` を取り出し、空でなければ `URLSearchParams` に積んで `router.push` する | AC-01-1 |
| キーワードを空にして「絞り込む」 | `keyword` を `URLSearchParams` に積まない。結果として URL からパラメータが消える | AC-05-1、AC-05-2 |
| 「リセット」 | `/resources`（クエリなし）へ遷移する。既存の `handleReset` がそのまま機能するため変更不要 | AC-06-1、AC-06-2 |
| `keyword` 付き URL を開く | `defaultKeyword` が入力欄の `defaultValue` に入り、値が表示される | AC-08-1、AC-08-2 |
| 「次へ」でページ送り | `PaginationNav` が `query` を引き継ぐため条件が維持される | AC-07-1 |

既存の送出ロジックは `if (category && category !== "ALL") params.set(...)` のように「値があれば積む」形で書かれている。キーワードも同じ形（`if (keyword) params.set("keyword", keyword)`）で揃える。空文字は falsy であるため、これだけで AC-05-1 が満たされる。

### 入力欄の配置とラベル

現在のフォームは3項目（カテゴリ・開始日時・終了日時）を `sm:grid-cols-3` のグリッドに並べている。キーワードを加えると4項目になる。

**配置**：キーワードを最初の項目として置く。利用者がまず思いつく絞り込み手段であり、カテゴリ・期間より手前にあるのが自然なためである。グリッドは `sm:grid-cols-2 lg:grid-cols-4` に変更し、狭い画面で4列に潰れないようにする。

**ラベル**：「キーワード」。既存の `Label` コンポーネントを使い、`htmlFor="keyword"` と入力欄の `id="keyword"` を対応させる。既存の各項目と同じ構造であり、スクリーンリーダーからラベルと入力欄の関連が読み取れる。

**プレースホルダー**：「リソース名・説明で検索」。何が検索対象かを入力前に示す。ラベルの代替としては使わない（プレースホルダーは入力開始で消えるため）。

**入力欄の型**：`type="text"`。`type="search"` は一部ブラウザでクリアボタンが出るが、既存の `Input` コンポーネントのスタイルと整合を取る必要が生じるため採らない。

**最大長**：`maxLength={100}` を付ける。バックエンドの検証（BR-10）と同じ値を入力側でも示し、超過をサーバー応答まで待たずに防ぐ。バックエンドの検証は取り除かない（フロントエンドの制限は迂回できるため）。

## `listResourcesAction`（`src/server/actions/resources.ts`）

**変更点**

| 項目 | 現在 | 変更後 |
|---|---|---|
| `ListResourcesParams` | `category` / `from` / `to` / `page` / `size` | `keyword?: string` を追加 |
| クエリ組み立て | `if (params?.category) queryParams.category = ...` | 同じ形で `keyword` を追加 |

既存の組み立ては「値があれば積む」形であるため、同じ書き方に揃える。`undefined` と空文字はいずれも積まれない。

`ResourceResponseSchema` は応答の形を検証するものであり、要求側のパラメータ追加では変更しない。

## API 連携点

| コンポーネント | 呼び出すエンドポイント | 本ユニットでの変更 |
|---|---|---|
| `ResourcesPage` | `GET /api/resources`（`listResourcesAction` 経由） | `keyword` を追加 |
| `ResourcesPage` | `GET /api/users/me`（`getProfileAction` 経由） | 変更なし |

## フォーム検証

クライアント側の検証は `maxLength` 属性による入力制限のみとする。React Hook Form と Zod は導入しない。既存のフィルタフォームがこれらを使っておらず、キーワードは形式的な制約を持たない自由入力であるため、スキーマ検証を足す理由がない。

## 変更しないもの

- `ResourceManagementClient.tsx`（管理者向けリソース管理画面）。本ユニットの範囲外。
- `PaginationNav`。`query` の引き継ぎで既に要件を満たす。
- `src/lib/types/api.ts` の Zod スキーマ。応答の形が変わらない。
