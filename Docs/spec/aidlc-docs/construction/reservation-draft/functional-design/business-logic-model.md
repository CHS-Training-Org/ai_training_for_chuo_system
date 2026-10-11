# Business Logic Model — reservation-draft

## データフロー概要

```text
POST /api/reservations（draft: boolean 追加）
  └─ ReservationService.create
       ├─ draft == true  → status = DRAFT、approval_steps 作成しない
       └─ draft == false → 既存ロジック（requiresApproval ? PENDING+approval_steps作成 : APPROVED）

PUT /api/reservations/{id}（submit: boolean 追加）
  └─ ReservationService.update
       ├─ status == PENDING                      → 既存ロジック（内容更新のみ、submitは無視）
       ├─ status == DRAFT かつ submit == false    → 内容更新のみ、status は DRAFT のまま
       ├─ status == DRAFT かつ submit == true     → 内容更新 + ステータス確定
       │     （requiresApproval ? PENDING+approval_steps作成 : APPROVED）
       └─ 上記以外（APPROVED/REJECTED/CANCELLED）  → 既存どおり422

GET /api/reservations/{id}
  └─ ReservationService.get → checkReadAccess
       ├─ status != DRAFT → 既存ロジック（MEMBERは本人のみ、ADMIN/APPROVERは全件可）
       └─ status == DRAFT → 本人 または ADMIN のみ可（APPROVERは本人でない限り403）

GET /api/reservations（一覧）
  └─ ReservationService.list（変更なし）
       MEMBER/APPROVER は requesterId スコープ、ADMIN のみ全件
       → APPROVERは元々本人の予約のみのため、他人のDRAFTが混入することはない
```

## ロジック1：新規作成時のステータス決定（`create` の拡張）

**入力**: `CreateReservationRequest`（`resourceId`・`startAt`・`endAt`・`purpose`・`attendeesCount`・新規 `draft`）
**既存のステップ1〜3**（リソース存在確認・日時整合性チェック・重複予約チェック）は変更しない。

**ステップ4（ステータス決定）を以下のように分岐する**：

```java
ReservationStatus status;
boolean createsApprovalStep;
if (req.draft()) {
  status = ReservationStatus.DRAFT;
  createsApprovalStep = false;
} else {
  status = resource.isRequiresApproval() ? ReservationStatus.PENDING : ReservationStatus.APPROVED;
  createsApprovalStep = resource.isRequiresApproval();
}
```

**ステップ6（承認ステップ生成）の条件を `createsApprovalStep` に置き換える**（従来の `resource.isRequiresApproval()` 単独判定から、`draft` を考慮した条件に変更）。

`CreateReservationRequest.draft()` は `null` 非許容・デフォルト `false` とする（Java の `record` では default 値を持てないため、DTO 側で `draft() != null && draft()` のように null 安全に扱うか、コンストラクタ/ファクトリで正規化する）。

## ロジック2：更新時のステータス遷移（`update` の拡張）

**入力**: `UpdateReservationRequest`（`startAt`・`endAt`・`purpose`・`attendeesCount`・新規 `submit`）

**既存のステータスガード**（`ReservationService.java:290-293`）を以下のように拡張する：

```java
ReservationStatus current = reservation.getStatus();
boolean isDraft = current == ReservationStatus.DRAFT;
boolean isPending = current == ReservationStatus.PENDING;
if (!isDraft && !isPending) {
  throw new BusinessException(ErrorCode.VALIDATION_ERROR, "PENDING または DRAFT 状態の予約のみ更新できます。現在のステータス: " + current);
}
```

**内容更新（`reservation.update(...)`）は現状どおり無条件に実行する**（startAt/endAt/purpose/attendeesCountの更新）。

**ステータス遷移は `isDraft && req.submit()` のときのみ実行する**（新規メソッド、例：`reservation.submit(ReservationStatus newStatus)` を `Reservation` エンティティに追加する案、または Service 層で直接 `markX()` 相当を呼ぶ案。具体的なメソッド配置は Code Generation 時に決定する）：

```java
if (isDraft && req.submit()) {
  ReservationStatus newStatus =
      reservation.getResource().isRequiresApproval() ? ReservationStatus.PENDING : ReservationStatus.APPROVED;
  reservation.submit(newStatus); // ドメインメソッド（新規）。DRAFT以外から呼ばれないことを前提にできる
  if (reservation.getResource().isRequiresApproval()) {
    approvalService.createInitialStep(reservation);
  }
}
```

`update` メソッドは既に `reservation.getResource()` に相当する情報を持っていない（`resourceRepository.findByIdForUpdate` で取得した `resource` 変数がローカルに存在する、`ReservationService.java:301-305`）ため、そのローカル変数を使う。

## ロジック3：承認ステップ生成条件（統一ルール）

| 経路 | `draft`/`submit` | `requiresApproval` | 結果ステータス | `approval_steps` |
|---|---|---|---|---|
| 新規作成 | `draft=false` | `true` | `PENDING` | 作成する |
| 新規作成 | `draft=false` | `false` | `APPROVED` | 作成しない |
| 新規作成 | `draft=true` | （不問） | `DRAFT` | 作成しない |
| 更新（内容のみ） | `submit=false`、現在`DRAFT` | （不問） | `DRAFT`（変化なし） | 作成しない |
| 更新（内容のみ） | 現在`PENDING` | （不問） | `PENDING`（変化なし） | 作成しない（既存どおり） |
| 正式申請 | `submit=true`、現在`DRAFT` | `true` | `PENDING` | 作成する |
| 正式申請 | `submit=true`、現在`DRAFT` | `false` | `APPROVED` | 作成しない |

## ロジック4：読み取りアクセス制御（`checkReadAccess` の拡張）

**既存**（`ReservationService.java:360-365`）：
```java
private void checkReadAccess(Reservation reservation, User currentUser) {
  if (currentUser.getRole() == Role.MEMBER
      && !reservation.getRequester().getId().equals(currentUser.getId())) {
    throw new AccessDeniedException("この予約を参照する権限がありません。");
  }
}
```

**拡張後**：
```java
private void checkReadAccess(Reservation reservation, User currentUser) {
  boolean isOwner = reservation.getRequester().getId().equals(currentUser.getId());
  if (currentUser.getRole() == Role.MEMBER && !isOwner) {
    throw new AccessDeniedException("この予約を参照する権限がありません。");
  }
  if (reservation.getStatus() == ReservationStatus.DRAFT
      && currentUser.getRole() == Role.APPROVER
      && !isOwner) {
    throw new AccessDeniedException("この予約を参照する権限がありません。");
  }
}
```

`ADMIN` は両条件とも該当しないため、常に通過する（既存どおり）。

## ロジック5：下書きの削除（キャンセル機構の転用）

`ReservationService.cancel`（`ReservationService.java:325-343`）は既に「本人または ADMIN」の所有権チェックと、`CANCELLABLE_STATUSES`（`ReservationService.java:53-54`、現状 `List.of(PENDING, APPROVED)`）によるステータスガードを持つ。**この定数に `DRAFT` を追加するだけで、既存の `cancel` メソッド・`POST /api/reservations/{id}/cancel` エンドポイントをそのまま下書きの削除相当として使える**（新規メソッド・新規エンドポイントは不要）。

フロントエンドの `CancelButton`・`CANCELLABLE_STATUSES`（`reservations/[id]/page.tsx`）も同様に `DRAFT` を含めるよう拡張する。
