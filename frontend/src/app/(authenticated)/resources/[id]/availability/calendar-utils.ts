import type { AvailabilitySlot } from "@/lib/types/api";

/**
 * カレンダービューの日付ロジック（純関数）。
 *
 * 日時は `YYYY-MM-DDTHH:mm:ss` の「壁時計文字列」で扱い、比較は文字列の辞書順で行う。
 * 実行環境のタイムゾーンに依存しないため、UTC のサーバーでも結果が変わらない。
 * 現在時刻だけは Asia/Tokyo で取る（{@link nowInTokyo}）。
 */

export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 20;

export type CalendarView = "week" | "month";
export type SlotState = "booked" | "inactive" | "past" | "available";

type SearchParamValue = string | string[] | undefined;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM-DD` を UTC の Date にする（日付演算専用。ローカルタイムゾーンを使わない）。 */
function toUtcDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function addDays(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

/** 実在する `YYYY-MM-DD` かどうか（2026-02-30 のような値は false）。 */
function isValidDate(value: string): boolean {
  return DATE_PATTERN.test(value) && formatDate(toUtcDate(value)) === value;
}

/** 日時文字列を秒までの `YYYY-MM-DDTHH:mm:ss` にそろえる（小数秒などを落とす）。 */
const normalize = (value: string) => value.slice(0, 19);

/** 現在時刻を Asia/Tokyo の壁時計文字列にする。テストでは `now` を固定して渡す。 */
export function nowInTokyo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

/**
 * URL のクエリパラメータを検証する。不正な値は既定値（週表示・今日）にフォールバックする。
 *
 * @param now 現在時刻の壁時計文字列（{@link nowInTokyo} の戻り値）
 */
export function parseCalendarParams(
  params: { view?: SearchParamValue; date?: SearchParamValue },
  now: string,
): { view: CalendarView; date: string } {
  const view: CalendarView = params.view === "month" ? "month" : "week";
  const date =
    typeof params.date === "string" && isValidDate(params.date) ? params.date : now.slice(0, 10);
  return { view, date };
}

/** 基準日を含む週（月曜始まり）の 7 日と、API 照会用の `from`/`to`。 */
export function getWeekRange(date: string): { days: string[]; from: string; to: string } {
  const offset = (toUtcDate(date).getUTCDay() + 6) % 7;
  const monday = addDays(date, -offset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return { days, from: `${days[0]}T00:00:00`, to: `${days[6]}T23:59:59` };
}

/** 基準日を含む月のグリッド（月曜始まり、前後の月の日を含む）と、API 照会用の `from`/`to`。 */
export function getMonthGrid(date: string): {
  weeks: string[][];
  month: string;
  from: string;
  to: string;
} {
  const month = date.slice(0, 7);
  const first = `${month}-01`;
  const last = formatDate(
    new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)),
  );
  const start = getWeekRange(first).days[0];
  const end = getWeekRange(last).days[6];
  const weeks: string[][] = [];
  for (let day = start; day <= end; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
  }
  return { weeks, month, from: `${start}T00:00:00`, to: `${end}T23:59:59` };
}

/** 「前へ」「次へ」の移動先。週は 7 日、月は 1 か月（同じ日がなければ月末に丸める）。 */
export function shiftDate(date: string, view: CalendarView, direction: -1 | 1): string {
  if (view === "week") {
    return addDays(date, direction * 7);
  }
  const [y, m, d] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + direction + 1, 0)).getUTCDate();
  const moved = new Date(Date.UTC(y, m - 1 + direction, Math.min(d, lastDay)));
  return formatDate(moved);
}

/** 指定日・時間の 1 時間枠の開始と終了。 */
export function slotRange(day: string, hour: number): { start: string; end: string } {
  return { start: `${day}T${pad(hour)}:00:00`, end: `${day}T${pad(hour + 1)}:00:00` };
}

function overlaps(slot: AvailabilitySlot, start: string, end: string): boolean {
  return normalize(slot.startAt) < end && normalize(slot.endAt) > start;
}

/** 枠（半開区間 [start, end)）と重なる占有スロットがあるか。 */
export function isOccupied(slots: AvailabilitySlot[], start: string, end: string): boolean {
  return slots.some((s) => overlaps(s, start, end));
}

/** その日に重なる占有予約の件数（reservationId の重複なし）。 */
export function countReservationsOnDay(slots: AvailabilitySlot[], day: string): number {
  const start = `${day}T00:00:00`;
  const end = `${addDays(day, 1)}T00:00:00`;
  return new Set(slots.filter((s) => overlaps(s, start, end)).map((s) => s.reservationId)).size;
}

/** 枠の状態。優先順位は booked > inactive > past > available。 */
export function getSlotState(input: {
  slots: AvailabilitySlot[];
  start: string;
  end: string;
  now: string;
  isActive: boolean;
}): SlotState {
  if (isOccupied(input.slots, input.start, input.end)) return "booked";
  if (!input.isActive) return "inactive";
  if (input.start < input.now) return "past";
  return "available";
}

/** 空き枠のクリック先（予約申請フォーム）。`startAt`/`endAt` は `YYYY-MM-DDTHH:mm`。 */
export function buildReservationHref(resourceId: string, day: string, hour: number): string {
  const { start, end } = slotRange(day, hour);
  const params = new URLSearchParams({
    resourceId,
    startAt: start.slice(0, 16),
    endAt: end.slice(0, 16),
  });
  return `/reservations/new?${params.toString()}`;
}

/** カレンダー内の移動・切り替えリンク（`/resources/{id}?view=…&date=…`）。 */
export function buildCalendarHref(resourceId: string, view: CalendarView, date: string): string {
  return `/resources/${resourceId}?${new URLSearchParams({ view, date }).toString()}`;
}

/** ツールバーに出す表示期間の見出し。週は「YYYY年M月D日 〜 M月D日」、月は「YYYY年M月」。 */
export function formatPeriodLabel(view: CalendarView, date: string): string {
  const part = (d: string) => `${Number(d.slice(5, 7))}月${Number(d.slice(8, 10))}日`;
  if (view === "month") {
    return `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月`;
  }
  const { days } = getWeekRange(date);
  return `${days[0].slice(0, 4)}年${part(days[0])} 〜 ${part(days[6])}`;
}
