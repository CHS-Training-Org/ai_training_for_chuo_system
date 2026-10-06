# Domain Entities — resource-search

## Resource（既存エンティティ、スキーマ変更なし）

本ユニットは `resources` テーブル・`Resource` エンティティに列追加や制約変更を必要としない。既存フィールドのうち検索に関与するのは以下の 2 つ。

| フィールド | 型 | 検索での役割 |
|---|---|---|
| `name` | `VARCHAR(100) NOT NULL` | keyword 部分一致の対象（BR-01） |
| `description` | `TEXT NULL` | keyword 部分一致の対象。NULL 許容のため BR-03 のガードが必要 |

検索条件として新たに関与するが値そのものは変更しない既存フィールド：

| フィールド | 役割 |
|---|---|
| `category` | 既存の完全一致フィルタ（BR-05 で keyword と AND 合成） |
| `is_active` | ロール別可視範囲（BR-06、keyword フィルタより外側で評価） |

## 新規エンティティ・値オブジェクト

なし。`keyword` は `ResourceController`/`ResourceService` を通過する間のみ有効な検索条件（プリミティブな `String`）として扱い、永続化対象のドメインモデルとしては導入しない。
