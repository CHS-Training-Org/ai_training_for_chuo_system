# Domain Entities — resource-sort

## スキーマ変更の有無

**変更なし**。本ユニットは既存の `Resource` エンティティ（`resources` テーブル）の既存カラム（`name`・`capacity`・`created_at`）を対象にソート順を変更するのみであり、新規カラム・新規テーブル・マイグレーションは不要。

## 対象カラム

| カラム | 型 | ソート時の注意点 |
|---|---|---|
| `name` | `VARCHAR(100) NOT NULL` | NULL は発生しない。大文字小文字を区別する自然順（BR-05） |
| `capacity` | `INTEGER`（NULL 許容） | NULL のリソースは常に末尾（BR-04） |
| `created_at` | `TIMESTAMP NOT NULL` | NULL は発生しない。デフォルトソート対象（BR-02） |
