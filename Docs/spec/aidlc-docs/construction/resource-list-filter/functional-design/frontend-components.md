---
type: spec
title: Frontend Components（resource-list-filter）
description: ResourceFilterForm・ResourcesPage・server actionへのkeyword対応設計
tags:
  - ai-dlc
  - functional-design
timestamp: 2026-07-19
references:
  - frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx
---

# Frontend Components

## コンポーネント階層（変更箇所のみ）

```
ResourcesPage (page.tsx, Server Component)
├── ResourceFilterForm (Client Component)
│   └── 追加: keyword用 <Input> フィールド
└── リソースカードリスト（変更なし）
```

## Props / State 変更

### ResourceFilterForm

- **Props 追加**: `defaultKeyword?: string`（既存の `defaultCategory`/`defaultFrom`/`defaultTo` と同じパターン）
- **State**: 追加のクライアント状態は持たない（既存同様 `FormData` 直読み。Zustand 導入は不要）
- **handleSubmit 変更**: `data.get("keyword")` を読み、値があれば `params.set("keyword", keyword)`（既存の `category`/`from`/`to` と同じ if 文パターンに追記）

### ResourcesPage（page.tsx）

- `SearchParams` インターフェースに `keyword?: string` を追加
- `listResourcesAction` 呼び出しに `keyword: params.keyword` を追加
- `ResourceFilterForm` に `defaultKeyword={params.keyword}` を渡す
- `PaginationNav` の `query` にも `keyword` が自動的に含まれる（`params` オブジェクトをそのまま渡している既存実装のため追加変更不要）

## API 連携

- `listResourcesAction`（`resources.ts`）の `ListResourcesParams` に `keyword?: string` を追加し、`queryParams.keyword` として `GET /api/resources` に渡す（既存の `category`/`from`/`to` と同じ if 文パターン）

## ユーザー操作フロー

1. 利用者がキーワード入力欄に文字列を入力し「絞り込む」を押す
2. `keyword` が URL クエリパラメータに反映される（例: `/resources?keyword=会議室`）
3. `ResourcesPage` が再レンダリングされ、絞り込み結果が表示される
4. 「リセット」を押すと `keyword` を含む全パラメータがクリアされる（既存の `handleReset` は `/resources` への遷移のみで変更不要）

## フォームバリデーション

追加のクライアント側バリデーションは不要（`keyword` は自由入力文字列で、空文字は「条件解除」として扱われる。BR-04 参照）。
