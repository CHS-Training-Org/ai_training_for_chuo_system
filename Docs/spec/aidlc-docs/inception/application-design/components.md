# Components

新規の独立コンポーネントは Specification 用クラス 1 つのみ。4 層構成は変更しない。

## Backend

| Component | 層 | 変更 | 責務 |
|-----------|----|------|------|
| `ResourceSpecifications`（新規） | domain | New | 検索条件（category / isActive / keyword）を `Specification<Resource>` として部品化する。keyword の LIKE エスケープと大文字小文字無視をここに閉じ込める |
| `ResourceRepository` | domain | Modify | `JpaSpecificationExecutor<Resource>` を継承する。一覧用の派生クエリ 6 本（`findByIsActiveTrue` / `findByCategoryAndIsActiveTrue` / `findByCategory` の Page・List 版）を置き換えて削除する。`findByIdForUpdate` は維持 |
| `ResourceService` | application | Modify | keyword の正規化（trim・空は条件なし）。ロール別可視性・category・keyword から Specification を組み立て、通常経路・from/to 経路の両方で使う |
| `ResourceController` | presentation | Modify | `keyword` を任意クエリとして受け取り、そのまま Service へ渡す（正規化しない） |

## Frontend

| Component | 変更 | 責務 |
|-----------|------|------|
| `resources/page.tsx` | Modify | SearchParams に `keyword` を追加し、`listResourcesAction` と `ResourceFilterForm` に渡す |
| `ResourceFilterForm.tsx` | Modify | キーワード入力欄を追加する（ラベル「キーワード」、プレースホルダ「名称・説明で検索」）。送信時、trim 後が空でなければ `keyword` を URL に付与する。見出し「フィルタ・空き確認」は維持 |
| `server/actions/resources.ts`（`listResourcesAction`） | Modify | `keyword` を API クエリに付与する（空なら付与しない） |

## 判断の根拠

- **`ResourceSpecifications` の置き場所**: 既存の `ResourceRepository`（domain）が Spring Data JPA に依存しているため、同じ domain 層に置く。application 層が infrastructure に依存する経路を作らない
- **派生クエリの削除**: 一覧取得の 8 通り（派生クエリ 6 本 + `JpaRepository` 継承の `findAll` 2 本）を Specification に集約し、組合せ爆発を悪化させない。削除対象は派生クエリ 6 本で、継承の `findAll` は削除対象ではない（一覧では使わなくなる）。`resource-list-sort` が後続で同じ仕組みに乗れる
