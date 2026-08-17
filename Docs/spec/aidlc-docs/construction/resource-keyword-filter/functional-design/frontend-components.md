---
type: spec
title: Frontend Components - resource-keyword-filter
description: リソース一覧のキーワード検索機能に関わるフロントエンドコンポーネント設計（AI-DLC Functional Design 成果物）
tags:
  - ai-dlc
  - functional-design
  - resource
  - search
  - frontend
timestamp: 2026-08-14
audience: 学習者・メンター
references:
  - Docs/spec/enhancements/resource-list-filter.md
---

# Frontend Components - resource-keyword-filter

## 対象コンポーネント

- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`（変更）
- `frontend/src/app/(authenticated)/resources/page.tsx`（変更、`SearchParams` 型と `ResourceFilterForm` 呼び出し）

新規コンポーネントの作成はない。

## `ResourceFilterForm` の変更

### Props

`defaultKeyword?: string` を追加する（既存の `defaultCategory`/`defaultFrom`/`defaultTo` と同じ役割）。

### フォーム要素

キーワード入力欄（`Input type="text" name="keyword"`）を追加する。既存のグリッド（`grid-cols-1 sm:grid-cols-3`）にキーワード欄を加えるため `sm:grid-cols-4` に変更し、カテゴリ・キーワード・開始日時・終了日時の順に並べる（キーワードはカテゴリの次、日時系の前に置く方が「絞り込み条件→期間条件」という既存の視覧順と整合する）。

### 送信時の挙動（`handleSubmit`）

- `FormData` から `keyword` を取得し、`.trim()` した結果が空文字でなければ `params.set("keyword", trimmed)` する（BR-03 と整合させ、空白のみの入力は URL パラメータに含めない）。
- 既存の `category`/`from`/`to` の組み立てロジックは変更しない。

### バリデーション

既存フォームにバリデーション基盤がないため、キーワード欄も同様に未検証（trim のみ）とする。新規に Zod スキーマを導入しない。

## `page.tsx` の変更

- `SearchParams` インターフェースに `keyword?: string` を追加する。
- `listResourcesAction` 呼び出しに `keyword: params.keyword` を渡す（`listResourcesAction`／`ResourceController.list()`／`ResourceService.list()` への引数追加は Code Generation ステージで対応）。
- `ResourceFilterForm` 呼び出しに `defaultKeyword={params.keyword}` を渡す。
- `PaginationNav` の `query` には `params` をそのまま渡しているため、`keyword` はページネーションリンクにも自動的に引き継がれる（既存の `category`/`from`/`to` と同様、追加対応不要）。

## ユーザー操作フロー

1. ユーザーがキーワード欄に文字列を入力し「絞り込む」を押す。
2. `handleSubmit` が `keyword` を含む URL（例：`/resources?keyword=会議室`）へ遷移する。
3. `page.tsx` が `keyword` を含めて `listResourcesAction` を呼び、絞り込み済みの一覧を表示する。
4. キーワード欄を空にして「絞り込む」を押すと、`keyword` パラメータが URL から外れ、キーワード条件が解除される。
5. 「リセット」ボタンは既存どおり `/resources` への遷移（全条件クリア）であり、変更不要。
