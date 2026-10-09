/**
 * 予約に対する操作可否の判定（screen-spec.md §予約 / requirements.md §共通 権限マトリクス 準拠）。
 *
 * 予約詳細画面と予約編集画面の双方から使うため、画面コンポーネントから切り出した純関数として定義する。
 * サーバー側の最終的な判定は `ReservationService` が行う。ここでの判定は導線の出し分けに使う。
 */
import type { ReservationStatus } from "@/lib/types/enums";

/** 内容を編集できるステータス。 */
const EDITABLE_STATUSES: ReservationStatus[] = ["DRAFT", "PENDING"];

interface ReservationActor {
  /** 対象予約の申請者がログインユーザー自身か */
  isOwner: boolean;
  /** ログインユーザーが ADMIN か */
  isAdmin: boolean;
}

/**
 * 予約内容を編集できるかを返す。
 *
 * ADMIN は `PUT /api/reservations/{id}` の権限を持たないため、他人の予約はもちろん閲覧できる下書きも編集できない。
 */
export function canEditReservation(
  status: string,
  { isOwner, isAdmin }: ReservationActor,
): boolean {
  return EDITABLE_STATUSES.includes(status as ReservationStatus) && isOwner && !isAdmin;
}

/**
 * 下書きを正式申請できるかを返す。
 *
 * 対象は `DRAFT` の予約に限り、操作できるのは申請者本人のみ。
 */
export function canSubmitDraft(status: string, { isOwner, isAdmin }: ReservationActor): boolean {
  return status === "DRAFT" && isOwner && !isAdmin;
}

/**
 * 下書きを削除できるかを返す。
 *
 * 対象は `DRAFT` の予約に限り、操作できるのは申請者本人のみ。ADMIN も削除できない。
 * 条件は現時点で `canSubmitDraft` と一致するが、仕様上は別のルール（削除可否と正式申請可否）
 * として定義されているため、関数を分けて個別に検証する。
 */
export function canDeleteDraft(status: string, { isOwner, isAdmin }: ReservationActor): boolean {
  return status === "DRAFT" && isOwner && !isAdmin;
}
