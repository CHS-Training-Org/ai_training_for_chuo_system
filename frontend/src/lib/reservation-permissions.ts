/**
 * 予約画面のボタンの出し分け条件（画面仕様書 §予約 / 設計の「画面の表示ルール」準拠）。
 *
 * 予約の状態、操作しているユーザーが申請者本人か、ADMIN かの 3 つから、各操作の可否を決める純関数。
 * DOM や API に依存しないため、単体テストで組み合わせを検証できる
 * （`buildResourceFilterParams` と同じ方針）。
 *
 * 画面の表示を決めるだけで、権限の強制はバックエンドが行う（画面の条件に頼らない）。
 */

/** 予約を取り消せる状態（バックエンドの取消可能な状態と同じ）。 */
const CANCELLABLE_STATUSES = ["PENDING", "APPROVED"];

export interface ReservationActionContext {
  /** 予約の状態（`DRAFT` / `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`）。 */
  status: string;
  /** 操作しているユーザーが、予約の申請者本人か。 */
  isOwner: boolean;
  /** 操作しているユーザーが ADMIN か。 */
  isAdmin: boolean;
}

export interface ReservationActions {
  /** 「編集」ボタンの表示と、編集画面を開けるか。 */
  canEdit: boolean;
  /** 「正式申請」ボタンの表示（下書きのみ）。 */
  canSubmit: boolean;
  /** 「削除」ボタンの表示（下書きのみ）。 */
  canDelete: boolean;
  /** 「キャンセル」ボタンの表示。 */
  canCancel: boolean;
}

/**
 * 予約に対して、ユーザーが行える操作を返す。
 *
 * - 編集: 承認待ちは ADMIN を除く本人、下書きは ADMIN を含む本人。
 * - 正式申請と削除: 下書きで、かつ本人（ADMIN を含む。他人の下書きは ADMIN も不可）。
 * - キャンセル: 承認待ちと承認済みで、本人または ADMIN（下書きは対象外）。
 */
export function getReservationActions({
  status,
  isOwner,
  isAdmin,
}: ReservationActionContext): ReservationActions {
  const isDraft = status === "DRAFT";
  return {
    canEdit: isOwner && (isDraft || (status === "PENDING" && !isAdmin)),
    canSubmit: isOwner && isDraft,
    canDelete: isOwner && isDraft,
    canCancel: CANCELLABLE_STATUSES.includes(status) && (isOwner || isAdmin),
  };
}
