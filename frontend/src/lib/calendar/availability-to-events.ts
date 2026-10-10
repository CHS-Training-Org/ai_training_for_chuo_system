/**
 * 空き確認 API のレスポンス（AvailabilitySlot[]）をカレンダー表示用のデータへ変換する
 * 純粋関数群（calendar-view ユニット）。
 *
 * business-rules.md BR-01・BR-04 の判定ロジックをここに実装する。
 */
import { addDays, format, startOfDay } from "date-fns";
import type { AvailabilitySlot } from "@/lib/types/api";
import type { CalendarViewMode } from "@/lib/calendar/period";

export interface CalendarEvent {
  start: Date;
  end: Date;
  reservationId: string;
}

/** onSelectSlot の選択結果（BR-01・BR-05 に基づく分岐） */
export type SlotSelectionResult =
  | { type: "switch-to-week"; anchorDate: Date }
  | { type: "navigate"; href: string }
  | { type: "none" };

const DAY_KEY_FORMAT = "yyyy-MM-dd";

/** 週表示用：AvailabilitySlot[] を react-big-calendar のイベント配列に変換する */
export function slotsToWeekEvents(slots: AvailabilitySlot[]): CalendarEvent[] {
  return slots.map((slot) => ({
    start: new Date(slot.startAt),
    end: new Date(slot.endAt),
    reservationId: slot.reservationId,
  }));
}

/**
 * 指定した時間範囲（start〜end）が、いずれかの AvailabilitySlot と重なるか判定する（BR-01）。
 * 区間の端が一致するだけ（例：枠の終了時刻 = 占有の開始時刻）は重なりとみなさない。
 */
export function isRangeOccupied(start: Date, end: Date, slots: AvailabilitySlot[]): boolean {
  return slots.some((slot) => {
    const slotStart = new Date(slot.startAt);
    const slotEnd = new Date(slot.endAt);
    return start < slotEnd && end > slotStart;
  });
}

/**
 * 月表示用：AvailabilitySlot[] が占有する日付（`yyyy-MM-dd`）の集合を返す（BR-04）。
 * 日をまたぐ占有枠は、開始日から終了日までの全ての日を「予約あり」として扱う。
 */
export function getDaysWithReservation(slots: AvailabilitySlot[]): Set<string> {
  const days = new Set<string>();
  for (const slot of slots) {
    let cursor = startOfDay(new Date(slot.startAt));
    const last = startOfDay(new Date(slot.endAt));
    while (cursor <= last) {
      days.add(format(cursor, DAY_KEY_FORMAT));
      cursor = addDays(cursor, 1);
    }
  }
  return days;
}

/** 指定日が `daysWithReservation`（getDaysWithReservation の結果）に含まれるか判定する */
export function hasReservationOnDay(date: Date, daysWithReservation: Set<string>): boolean {
  return daysWithReservation.has(format(date, DAY_KEY_FORMAT));
}

/**
 * onSelectSlot（枠クリック・ドラッグ選択）の結果を判定する。
 *
 * - 月表示：画面遷移せず、その日を含む週の週表示に切り替える（BR-05）
 * - 週表示・占有範囲：クリック不可のため何もしない（BR-01・念のための二重チェック）
 * - 週表示・空き範囲：予約申請フォームへの遷移先 URL を組み立てる
 */
export function resolveSlotSelection(
  viewMode: CalendarViewMode,
  slotInfo: { start: Date; end: Date },
  slots: AvailabilitySlot[],
  resourceId: string,
): SlotSelectionResult {
  if (viewMode === "month") {
    return { type: "switch-to-week", anchorDate: slotInfo.start };
  }
  if (isRangeOccupied(slotInfo.start, slotInfo.end, slots)) {
    return { type: "none" };
  }
  const startAt = format(slotInfo.start, "yyyy-MM-dd'T'HH:mm");
  return {
    type: "navigate",
    href: `/reservations/new?resourceId=${resourceId}&startAt=${startAt}`,
  };
}
