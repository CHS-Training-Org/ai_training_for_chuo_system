# Code Summary — reservation-draft

## 設計上の判断

- **遷移ガードの置き場所**: 業務判定（権限・重複・`requires_approval`・承認ステップ生成）は `ReservationService` に集約。ドメイン（`Reservation.submit()`）は `DRAFT` 以外・不正な遷移先を `IllegalStateException` で弾く最終防御のみ。
- **失敗時に `DRAFT` を維持**: 正式申請の 409 / `APPROVER_NOT_AVAILABLE` は `@Transactional` のロールバックで `DRAFT` のまま残る。
- **権限は Service 内の所有権チェック**（既存方式を踏襲。`@PreAuthorize` は不使用）。
- Flyway・`ErrorCode` の追加なし。

## Backend

- Modified: `domain/Reservation.java`（`submit()`）、`application/ReservationService.java`（下書き作成・DRAFT 更新・正式申請・`delete()`・DRAFT 閲覧権限）、`presentation/ReservationController.java`（`DELETE`）、`presentation/dto/CreateReservationRequest.java`（`draft`）、`presentation/dto/UpdateReservationRequest.java`（`submit`）
- Tests modified: `ReservationServiceTest`（`Create` に下書き3件、新規 `Draft` ネスト）、`ReservationControllerTest`（下書き系17件）

## Frontend

- Modified: `lib/schemas/reservation.ts`、`lib/api-client.ts`（`deleteEmpty`）、`lib/labels.ts`（「下書き」）、`server/actions/reservations.ts`（`submitReservationAction` / `deleteReservationAction`）、`reservations/new/ReservationForm.tsx`、`reservations/page.tsx`、`reservations/[id]/page.tsx`、`reservations/[id]/edit/page.tsx`、`reservations/[id]/edit/ReservationEditForm.tsx`
- Created: `reservations/[id]/SubmitDraftButton.tsx`、`reservations/[id]/DeleteDraftButton.tsx`
- Tests: Modified `tests/unit/msw/handlers.ts`（DELETE 追加のみ）、`tests/unit/server/actions/reservations.test.ts`／Created `tests/unit/lib/reservation-schema.test.ts`、`tests/unit/app/reservation-form.test.tsx`、`tests/unit/app/reservation-detail-page.test.tsx`

## 変異検証（Code Generation 中に実施・復元済み）

| 変異 | 検出したテスト |
|---|---|
| フォームの `draft: true` 付与を撤去 | `reservation-form.test.tsx` |
| 詳細の `canManageDraft` から本人・ADMIN 条件を撤去 | `reservation-detail-page.test.tsx` |
| `checkReadAccess` の DRAFT 制限を撤去 | `ReservationServiceTest` / `ReservationControllerTest`（APPROVER 403） |
| `decideStatus` を常に `APPROVED` に変更 | `PENDING` 遷移系の Service / Controller テスト |

## 実装中の確認（最小限）

- `./gradlew test spotlessCheck checkstyleMain checkstyleTest`、`pnpm lint` / `tsc --noEmit` / `pnpm test` を実行し成功。正式な検証は Build and Test ステージで実施する。
