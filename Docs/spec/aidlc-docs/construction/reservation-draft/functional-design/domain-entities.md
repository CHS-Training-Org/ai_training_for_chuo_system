# Domain Entities — reservation-draft

## `Reservation`（変更）

スキーマ変更なし（`reservations` テーブルはそのまま。`DRAFT` は既存の CHECK 制約に定義済み）。

### 追加メソッド

```java
/**
 * 予約を承認待ちにする（下書きの正式申請用）。
 *
 * <p>ステータスを {@link ReservationStatus#PENDING} に変更する。
 * 呼び出し前に Service 層で遷移可否（現在 DRAFT であること）を確認すること。
 */
public void markPending() {
  this.status = ReservationStatus.PENDING;
  this.updatedAt = LocalDateTime.now();
}
```

- 既存の `cancel()`／`markApproved()`／`markRejected()` と同じ「無条件セッター」パターン（事前条件を持たない）。javadoc も同じ文体（「呼び出し前に Service 層で確認すること」）に揃える
- `requires_approval=false` での正式申請（`DRAFT → APPROVED`）は、既存の `markApproved()` をそのまま再利用する（新規メソッド不要）

### 変更なしのメソッド

`create()`／`update()`／`cancel()`／`markApproved()`／`markRejected()`／各種 getter は変更しない。

## `ReservationStatus`（変更なし）

```java
public enum ReservationStatus {
  DRAFT,
  PENDING,
  APPROVED,
  REJECTED,
  CANCELLED
}
```

既に `DRAFT` が定義済みのため変更不要。

## DTO の変更

### `CreateReservationRequest`（フィールド追加）

| フィールド | 型 | 必須 | 備考 |
|---|---|---|---|
| `draft` | `Boolean` | ❌（デフォルト `false` 相当） | `true` の場合 `DRAFT` として保存（D1/D5） |

既存フィールド（`resourceId`／`startAt`／`endAt`／`purpose`／`attendeesCount`）のバリデーションアノテーションは変更しない。

### `UpdateReservationRequest`（フィールド追加）

| フィールド | 型 | 必須 | 備考 |
| `submit` | `Boolean` | ❌（デフォルト `false` 相当） | `true` の場合、現在 `DRAFT` の予約を正式申請する（D2/D7） |

既存フィールドは変更しない。

## エンティティ関係（変更なし）

`Reservation` → `Resource`（多対一）、`Reservation` → `User`（申請者、多対一）、`Reservation` → `ApprovalStep`（一対多、`requires_approval=true` かつステータスが `PENDING` になった時点で生成）。関係の多重度・外部キーに変更はない。
