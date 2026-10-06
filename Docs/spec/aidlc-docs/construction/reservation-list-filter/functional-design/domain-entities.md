# Domain Entities — reservation-list-filter

## スキーマ変更の有無

**変更なし**。本ユニットは既存の `Reservation` エンティティ（`reservations` テーブル）の既存カラム（`start_at`・`end_at`）と、既存の `resource` 関連（`Reservation.resource.name`）を対象にフィルタするのみであり、新規カラム・新規テーブル・マイグレーションは不要。

## 対象カラム・関連

| 対象 | 型 | フィルタ時の注意点 |
|---|---|---|
| `Reservation.resource`（`@ManyToOne`） | `Resource` | 既存の一覧クエリが `JOIN FETCH r.resource` 済みのため N+1 の心配なく `r.resource.name` で絞り込める |
| `Reservation.startAt` / `endAt` | `TIMESTAMP NOT NULL` | NULL は発生しない。overlap 判定（BR-04）の対象 |
