# Code Structure — reservation-draft（予約の下書き保存）スコープ限定調査

> 本ファイルは Issue #30「予約の下書き保存」の実装に必要な範囲に限定した Reverse Engineering 成果物である。既存の `code-structure-*.md`（他ユニット向け）はそれぞれ別スコープのため変更しない。

## 1. `ReservationStatus` の定義

`backend/src/main/java/com/example/bookflow/domain/ReservationStatus.java:8-14`
```java
public enum ReservationStatus {
  DRAFT,
  PENDING,
  APPROVED,
  REJECTED,
  CANCELLED
}
```

DB の CHECK 制約（`V001__create_initial_schema.sql:55`）と完全一致。DB DEFAULT なし（`V001:49`）。

**既存の遷移ロジック**（`backend/.../domain/Reservation.java`）:
- `create(...)`：呼び出し元（Service）が渡した `status` をそのままセット（DRAFT を渡す経路は存在しない）
- `update(...)`：ステータス自体は変更しない（startAt/endAt/purpose/attendeesCount のみ）
- `cancel()`：`status = CANCELLED`
- `markApproved()` / `markRejected()`：`ApprovalService.approve`/`reject` から呼ばれる

→ **DRAFT に設定する経路、DRAFT から遷移するメソッドは現状どこにも存在しない。**

フロントエンド対応定義：`frontend/src/lib/types/enums.ts` の `ReservationStatusSchema`（DRAFT含む5値）、`frontend/src/lib/labels.ts` の `RESERVATION_STATUS_LABELS`（`DRAFT: "ドラフト"` 定義済み）。

## 2. `POST /api/reservations` の処理フロー

`ReservationController.java` の `create` → `ReservationService.create`。

`CreateReservationRequest.java` フィールド：`resourceId`・`startAt`・`endAt`・`purpose`・`attendeesCount`。**`draft` フィールドは存在しない。**

`ReservationService.create` の流れ：
1. リソース存在確認（悲観ロック）
2. 日時整合性チェック
3. 重複予約チェック
4. **ステータス決定**：`resource.isRequiresApproval() ? PENDING : APPROVED`（**DRAFT 分岐は存在しない**）
5. 予約保存
6. **承認ステップ生成**：`if (resource.isRequiresApproval()) { approvalService.createInitialStep(saved); }`（**ステータスではなくリソース設定のみが条件**。現状 PENDING と requires_approval=true は常に1対1対応するため問題ないが、DRAFT 作成時にこの分岐をそのまま使うと誤って承認ステップが生成される構造）

## 3. `PUT /api/reservations/{id}` の処理フロー

`UpdateReservationRequest.java` フィールド：`startAt`・`endAt`・`purpose`・`attendeesCount` のみ（`resourceId` を含まない）。**ステータス遷移を指定するフィールドは存在しない。**

`ReservationService.update` の流れ：
1. 所有権チェック（本人のみ）
2. **ステータスガード**：`if (reservation.getStatus() != PENDING) { throw BusinessException(422, ...) }` → **PENDING 以外は一律422。DRAFT 状態の更新・DRAFT→PENDING 遷移の分岐は存在しない**
3. 日時整合性・重複チェック
4. `reservation.update(...)` 実行（ステータスは変更しない内容更新メソッド）

テスト `update_approvedReservation_throwsBusinessException`（`ReservationServiceTest.java:374`）がこのガードの検証例。同じロジックが DRAFT にも適用される想定だが、DRAFT を作る経路が無いため現状未テスト。

## 4. `approval_steps` の作成箇所

`ApprovalService.createInitialStep(Reservation reservation)`：`role=APPROVER` のユーザーを1名取得し `ApprovalStep.create(reservation, approver)` を保存（ベース実装は1段階承認）。

呼び出し元は `ReservationService.create` のみ、条件は `resource.isRequiresApproval()` のみ（**予約の `status` 自体は判定条件に含まれていない**）。

## 5. 予約申請画面（`/reservations/new`）

`page.tsx`：`?resourceId=`・`?startAt=` クエリで初期値セット、`ReservationForm` をレンダリングするのみ。

`ReservationForm.tsx`：
- 送信処理：`createReservationAction(values)` を呼び出し、成功時 `/reservations` へリダイレクト
- **ボタンは現状2個のみ**：「予約を申請する」（submit）と「キャンセル」（`router.back()`）。**「下書き保存」ボタンは存在しない**

`frontend/src/lib/schemas/reservation.ts` の `CreateReservationSchema`：`resourceId`・`startAt`・`endAt`・`purpose`・`attendeesCount` の5フィールド。**`draft` フィールドは存在しない**。`UpdateReservationSchema` も同様に遷移用フィールドなし。

`createReservationAction`（`frontend/src/server/actions/reservations.ts`）は input をそのまま POST するのみ。`draft` を渡す口はない。

## 6. 予約一覧画面（`/reservations`）

`frontend/src/app/(authenticated)/reservations/page.tsx`：
- **`ALL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]`** → **タブ一覧に DRAFT は含まれていない**。URL `?status=DRAFT` を直接指定すれば BE 側はフィルタ可能（`listReservationsAction` は status 配列をそのままクエリに渡す設計）だが、UI 上のタブ選択肢には出てこない
- フィルタは `status`（複数可）・`resourceName`（部分一致）・`from`/`to`（期間重複）の3種。`listReservationsAction` は単純な委譲

`ReservationFilterForm.tsx` はリソース名・期間のみでステータスには関与しない。

## 7. 予約詳細・編集画面

`frontend/src/app/(authenticated)/reservations/[id]/page.tsx`：
- 編集可否：`canEdit = reservation.status === "PENDING" && isOwner && !isAdmin` → **PENDING のみ編集ボタン表示、DRAFT は対象外**
- キャンセル可否：`CANCELLABLE_STATUSES = ["PENDING", "APPROVED"]` → **DRAFT はキャンセル対象外（削除ボタンも存在しない）**

`frontend/src/app/(authenticated)/reservations/[id]/edit/page.tsx`：
- アクセス制御：`if (isAdmin || !isOwner || reservation.status !== "PENDING") { notFound(); }` → **PENDING 以外（DRAFT含む）は `notFound()` で弾かれる**

`ReservationEditForm.tsx`：`updateReservationAction` を呼ぶのみ、「正式申請」ボタンや DRAFT→PENDING 遷移をトリガーする UI は存在しない。

## 8. `DRAFT` ステータスの現状の扱い（事実整理）

フロントエンドの DRAFT 言及箇所は、`reservations/page.tsx`・`reservations/[id]/page.tsx` の `STATUS_VARIANTS`/`statusBadgeClass`（バッジ色・CSS クラス）、`labels.ts`（表示ラベル「ドラフト」）の**表示用マッピングテーブルのみ**。業務ロジック（作成経路・遷移・一覧フィルタ・編集可否）には一切関与しない。

→ **判定：DRAFT は enum・DB CHECK 制約・表示用マッピングには定義済みだが、実際に DRAFT を生成する手段が現状存在しないため、実質的に到達不能コードパスである。**

spec 内の明示的な記述：
- `docs-next/docs/spec/api-spec.md:557`：「DB の CHECK 制約には `DRAFT` も定義されているがベース実装では未使用」
- `docs-next/docs/spec/requirements.md:142`：「`DRAFT` はベース実装では未使用（下書き保存は拡張課題用の予約値）」
- `docs-next/docs/spec/requirements.md:226`：「下書き保存（DRAFT 生成）はベース実装の対象外」
- `docs-next/docs/spec/er-diagram.md:78`：同上

## 9. 既存の関連テスト

**Backend**（DRAFT 関連テストは0件）：
- `ReservationServiceTest.java`：`create_noConflictRequiresApprovalFalse_returnsApproved`・`create_noConflictRequiresApprovalTrue_returnsPending`・`update_pendingReservationByOwner_returnsUpdated`・`update_approvedReservation_throwsBusinessException`（ステータスガードの直接的な検証例）・`cancel_*` 系
- `ApprovalServiceTest.java`：`createInitialStep_approverExists_savesStep` 等
- `ReservationControllerTest.java`：`create_noApprovalRequiredResource_returns201Approved`・`create_approvalRequiredResource_returns201Pending`・`update_approvedReservation_returns422` 等

**Frontend**（DRAFT 関連テストは0件）：
- `reservation-form.test.tsx`・`reservation-new-page.test.tsx`：`defaultStartAt` 関連のみ
- `server/actions/reservations.test.ts`：`createReservationAction`・`updateReservationAction` の正常系/異常系
- `reservation-filter-form.test.tsx`：resourceName/from/to/status 転記ロジックのみ
- `tests/e2e/reservation-flow.spec.ts`：正常系シナリオ1本のみ

## 要件 RSV-01〜05 実現のために変更が必要な箇所（事実整理。設計判断は含まない）

### バックエンド

| ファイル | 種別 | 変更が必要な箇所（事実） |
|---|---|---|
| `presentation/dto/CreateReservationRequest.java` | 既存改修 | `draft` に相当するフィールドが無い |
| `application/ReservationService.java` | 既存改修 | `create`：ステータス決定（`requiresApproval`のみで判定）・承認ステップ生成条件（`resource.isRequiresApproval()`のみで判定）がDRAFTケース未考慮。`update`：ステータスガード（`!= PENDING`で一律422）がDRAFT→PENDING遷移（RSV-03）を許容していない。`checkReadAccess`（MEMBER=本人以外403、APPROVER/ADMINは全件閲覧可）とRSV-02「申請者本人のみ閲覧」との整合確認が必要 |
| `presentation/dto/UpdateReservationRequest.java` | 既存改修 | RSV-03「DRAFT→PENDING遷移」を表現する手段（フィールド追加等）が無い |
| `presentation/ReservationController.java` | 既存改修 | Javadoc・既存コメント（「draft=false→即APPROVED、true→PENDING」という記述がRSV-01文言と異なる）の整合確認 |
| `domain/Reservation.java` | 既存改修 | DRAFT→PENDING遷移用の明示的メソッドが存在しない（`update`はステータス変更をしない設計） |
| `application/ApprovalService.java` | 既存改修確認 | `createInitialStep`の呼び出し条件自体は`ReservationService`側にあるため、RSV-02の保証箇所は呼び出し側次第 |
| （DB migration） | 変更要否は実装方針次第 | 既存`chk_reservations_status`にDRAFTは既に含まれているため、CHECK制約自体の変更は不要と見られる |

### フロントエンド

| ファイル | 種別 | 変更が必要な箇所（事実） |
|---|---|---|
| `frontend/src/lib/schemas/reservation.ts` | 既存改修 | `CreateReservationSchema`に`draft`に相当するフィールドが無い。`UpdateReservationSchema`にも遷移を表すフィールドが無い |
| `frontend/src/server/actions/reservations.ts` | 既存改修 | `createReservationAction`はinputをそのままPOSTするのみ。`draft`パラメータを含めて送る経路が無い。`updateReservationAction`もDRAFT→PENDING遷移を表現する経路が無い |
| `.../reservations/new/ReservationForm.tsx` | 既存改修 | ボタンは「予約を申請する」「キャンセル」の2個のみ。RSV-04「下書き保存」ボタンが無い |
| `.../reservations/page.tsx` | 既存改修 | `ALL_STATUSES`にDRAFTが含まれていないためタブに出ない（RSV-05）。表示色定義（`STATUS_VARIANTS`・`statusBadgeClass`）は既にDRAFT対応済みのため、この部分の追加改修は不要の可能性がある |
| `.../reservations/[id]/page.tsx` | 既存改修 | `canEdit`・`canCancel`判定にDRAFTが含まれていない（RSV-02の「本人のみ閲覧・編集・削除」、受入条件の「再編集・正式申請」ができない）。削除操作のUIは現状どこにも存在しない（キャンセル機能はあるが削除は無い） |
| `.../reservations/[id]/edit/page.tsx` | 既存改修 | アクセス制御が`status !== "PENDING"`でDRAFTを弾いている（RSV-03の「DRAFTの再編集」ができない） |
| `.../reservations/[id]/edit/ReservationEditForm.tsx` | 既存改修確認 | 「正式申請」（DRAFT→PENDING遷移）をトリガーするUI要素が存在しない |

### spec（`/update-spec` の運用ルール上、実装前に更新対象となる可能性のあるファイル。現状記述のみ）

- `docs-next/docs/spec/api-spec.md:557`、`requirements.md:142,226`、`er-diagram.md:78`：いずれも「DRAFTはベース実装では未使用」という現状の記述

### テスト（新規作成の可能性がある箇所。現状カバレッジ0件）

- `ReservationServiceTest.java`・`ReservationControllerTest.java`：DRAFT関連テスト0件
- `reservation-form.test.tsx`・`reservation-new-page.test.tsx`・`server/actions/reservations.test.ts`：DRAFT関連テスト0件
- `tests/e2e/reservation-flow.spec.ts`：下書き関連シナリオ0件
