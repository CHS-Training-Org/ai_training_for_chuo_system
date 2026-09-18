# Domain Entities: CSV 帳票出力

## ReservationCsvRow（新規）

読み取り専用の射影モデル。永続化コンテキストに紐づかず、`Reservation` エンティティの LAZY 関連を一切保持しない。

| フィールド | 型 | 由来 |
|---|---|---|
| `id` | `UUID` | `reservations.id` |
| `resourceName` | `String` | `resources.name`（JOIN） |
| `requesterName` | `String` | `users.name`（JOIN、申請者） |
| `startAt` | `LocalDateTime` | `reservations.start_at` |
| `endAt` | `LocalDateTime` | `reservations.end_at` |
| `purpose` | `String` | `reservations.purpose` |
| `status` | `ReservationStatus`（既存 enum） | `reservations.status` |

**既存エンティティとの関係**: `Reservation`・`Resource`・`User` のいずれも変更しない。`ReservationCsvRow` は JPQL のコンストラクタ式（`SELECT new ...`）によってクエリ結果から直接生成される、読み取り専用の派生モデルである。

**既存の `ReservationResponse`（DTO）との違い**: `attendeesCount`（参加人数）を含まない。RPT-02 が定義する CSV 列（予約 ID・リソース名・申請者名・開始日時・終了日時・目的・承認状態）に `attendeesCount` は含まれないため、DTO をそのまま流用せず専用モデルを新設する。
