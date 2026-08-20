import type { AvailabilitySlot } from "@/lib/types/api";

export type CalendarViewMode = "week" | "month";

export interface CalendarPeriod {
  from: Date;
  to: Date;
}

export interface HourSlotStatus {
  date: Date;
  hour: number;
  occupied: boolean;
  reservationId: string | null;
}

export interface DaySummary {
  date: Date;
  reservationCount: number;
  isCurrentMonth: boolean;
}

// ---------------------------------------------------------------------------
// 日付ユーティリティ（内部利用のみ）
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date): Date {
  // getDay() は 0=日曜〜6=土曜を返すため、月曜始まりに変換する
  const diffFromMonday = (date.getDay() + 6) % 7;
  return addDays(date, -diffFromMonday);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

// ---------------------------------------------------------------------------
// 表示期間算出
// ---------------------------------------------------------------------------

/**
 * 表示モードとアンカー日付から、空き状況取得の対象期間（半開区間 [from, to)）を算出する。
 */
export function computePeriod(viewMode: CalendarViewMode, anchorDate: Date): CalendarPeriod {
  if (viewMode === "week") {
    const from = startOfWeek(anchorDate);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfMonth(anchorDate);
  return { from, to: new Date(from.getFullYear(), from.getMonth() + 1, 1) };
}

/**
 * 表示期間を前後に移動したときの新しいアンカー日付を算出する。
 *
 * 月表示は、日数の少ない月への移動でJavaScriptのDateがロールオーバーしないよう、
 * 移動前にその月の1日へ正規化してから加減算する。
 */
export function shiftAnchorDate(
  viewMode: CalendarViewMode,
  anchorDate: Date,
  direction: "prev" | "next",
): Date {
  const sign = direction === "next" ? 1 : -1;
  if (viewMode === "week") {
    return addDays(anchorDate, 7 * sign);
  }
  const normalized = startOfMonth(anchorDate);
  return new Date(normalized.getFullYear(), normalized.getMonth() + sign, 1);
}

/**
 * トゥールバーに表示する期間ラベルを組み立てる。
 */
export function formatPeriodLabel(viewMode: CalendarViewMode, period: CalendarPeriod): string {
  if (viewMode === "week") {
    const weekEnd = addDays(period.to, -1);
    return `${period.from.toLocaleDateString("ja-JP")} 〜 ${weekEnd.toLocaleDateString("ja-JP")}`;
  }
  return period.from.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}

// ---------------------------------------------------------------------------
// スロット → グリッド写像
// ---------------------------------------------------------------------------

/**
 * 半開区間 [from, to) による重複判定。バックエンドの ResourceService.overlaps と同一の定義。
 */
function overlaps(slot: AvailabilitySlot, from: Date, to: Date): boolean {
  return new Date(slot.startAt) < to && new Date(slot.endAt) > from;
}

/**
 * 週表示用に、7日 × 24時間 = 168個の1時間セルへ OccupiedSlot[] を写像する。
 */
export function buildWeekSlots(
  weekStart: Date,
  occupiedSlots: AvailabilitySlot[],
): HourSlotStatus[] {
  const slots: HourSlotStatus[] = [];
  for (let day = 0; day < 7; day++) {
    const date = addDays(weekStart, day);
    for (let hour = 0; hour < 24; hour++) {
      const cellStart = new Date(date);
      cellStart.setHours(hour, 0, 0, 0);
      const cellEnd = new Date(date);
      cellEnd.setHours(hour + 1, 0, 0, 0);
      const match = occupiedSlots.find((slot) => overlaps(slot, cellStart, cellEnd));
      slots.push({
        date,
        hour,
        occupied: match !== undefined,
        reservationId: match?.reservationId ?? null,
      });
    }
  }
  return slots;
}

/**
 * 月表示用に、月曜始まりの完全な週単位（前月・翌月の日付を含みうる）で日次要約を算出する。
 */
export function buildMonthDays(anchorDate: Date, occupiedSlots: AvailabilitySlot[]): DaySummary[] {
  const monthStart = startOfMonth(anchorDate);
  const currentMonth = monthStart.getMonth();
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const lastDayOfMonth = addDays(nextMonthStart, -1);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = addDays(startOfWeek(lastDayOfMonth), 7);

  const days: DaySummary[] = [];
  for (let date = gridStart; date < gridEnd; date = addDays(date, 1)) {
    const dayEnd = addDays(date, 1);
    const reservationCount = occupiedSlots.filter((slot) => overlaps(slot, date, dayEnd)).length;
    days.push({ date, reservationCount, isCurrentMonth: date.getMonth() === currentMonth });
  }
  return days;
}

// ---------------------------------------------------------------------------
// 予約申請フォームへの遷移URL生成
// ---------------------------------------------------------------------------

function buildReservationUrl(resourceId: string, date: Date, hour: number): string {
  const startAt = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(hour)}:00`;
  const params = new URLSearchParams({ resourceId, startAt });
  return `/reservations/new?${params.toString()}`;
}

/**
 * 週表示のセルのクリック可否を一元的に決定する。
 * 占有中のセルは null を返し（クリック不可）、空きセルは遷移先URLを返す。
 */
export function getWeekCellHref(cell: HourSlotStatus, resourceId: string): string | null {
  if (cell.occupied) return null;
  return buildReservationUrl(resourceId, cell.date, cell.hour);
}
