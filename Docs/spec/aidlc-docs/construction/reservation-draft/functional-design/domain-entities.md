# Domain Entities — reservation-draft

## 結論：新規エンティティ・DBスキーマ変更なし

`DRAFT` は既存の `ReservationStatus` enum・DB CHECK制約に定義済みのため、新しいテーブル・新しいカラム・マイグレーションは不要。

## 既存エンティティへの変更

### `ReservationStatus`（enum、変更なし）

```java
public enum ReservationStatus {
  DRAFT, PENDING, APPROVED, REJECTED, CANCELLED
}
```

変更不要。既に全値定義済み。

### `Reservation`（エンティティ、メソッド追加）

既存の `create`・`update`・`cancel`・`markApproved`・`markRejected` に加え、DRAFT→PENDING/APPROVED 遷移用のメソッドを追加する（名称は Code Generation 時に確定。候補：`submit(ReservationStatus newStatus)`）。このメソッドは「呼び出し前に Service 層で `status == DRAFT` であることを確認済み」という既存の設計方針（`cancel()`・`markApproved()` と同様、ステータスガードは Service 層の責務）を踏襲する。

### `CreateReservationRequest`（DTO、フィールド追加）

```java
public record CreateReservationRequest(
    @NotNull UUID resourceId,
    @NotNull LocalDateTime startAt,
    @NotNull LocalDateTime endAt,
    @NotBlank @Size(max = 255) String purpose,
    @Positive Integer attendeesCount,
    Boolean draft // 新規追加。null/false は「下書きではない」として扱う
) {}
```

### `UpdateReservationRequest`（DTO、フィールド追加）

```java
public record UpdateReservationRequest(
    @NotNull LocalDateTime startAt,
    @NotNull LocalDateTime endAt,
    @NotBlank @Size(max = 255) String purpose,
    @Positive Integer attendeesCount,
    Boolean submit // 新規追加。null/false は「正式申請しない」として扱う
) {}
```

### `ReservationResponse`（DTO、変更なし）

`status` フィールドは既に `ReservationStatus` をそのまま返すため、`DRAFT` 値が返っても型上は問題ない。

## フロントエンド型定義への影響

- `frontend/src/lib/schemas/reservation.ts`：`CreateReservationSchema` に `draft: z.boolean().optional()`、`UpdateReservationSchema` に `submit: z.boolean().optional()` を追加
- `frontend/src/lib/types/enums.ts`：`ReservationStatusSchema` は変更不要（既に`DRAFT`を含む）
- `frontend/src/lib/types/api.ts`：`ReservationResponseSchema` は変更不要
