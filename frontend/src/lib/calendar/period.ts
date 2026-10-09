/**
 * カレンダービュー（週/月表示）の表示期間計算ロジック（calendar-view ユニット、純粋関数）
 *
 * 週は月曜始まり。月表示はグリッド表示用に前後月の日付を含む週単位の範囲とする
 * （Docs/spec/aidlc-docs/construction/calendar-view/functional-design/business-logic-model.md 準拠）。
 */
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from "date-fns";

export type CalendarViewMode = "week" | "month";

export interface DisplayRange {
  start: Date;
  end: Date;
}

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

/** 週表示の範囲（月曜 0:00 〜 日曜 23:59:59.999）を返す */
export function getWeekRange(anchorDate: Date): DisplayRange {
  return {
    start: startOfWeek(anchorDate, WEEK_OPTIONS),
    end: endOfWeek(anchorDate, WEEK_OPTIONS),
  };
}

/** 月表示の範囲（グリッド表示用に月初・月末を含む週全体に拡張）を返す */
export function getMonthRange(anchorDate: Date): DisplayRange {
  return {
    start: startOfWeek(startOfMonth(anchorDate), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(anchorDate), WEEK_OPTIONS),
  };
}

/** 表示モードに応じた表示範囲を返す */
export function getDisplayRange(viewMode: CalendarViewMode, anchorDate: Date): DisplayRange {
  return viewMode === "week" ? getWeekRange(anchorDate) : getMonthRange(anchorDate);
}

/**
 * Date を空き確認 API の from/to 形式（TZ なし ISO 文字列、秒まで）に変換する。
 * 既存実装（resources/[id]/page.tsx の初期表示取得）と同じ変換方式に合わせる。
 */
export function toApiDateTimeString(date: Date): string {
  return date.toISOString().slice(0, 19);
}

/** 表示期間を前後に移動した後の anchorDate を返す */
export function navigatePeriod(
  viewMode: CalendarViewMode,
  anchorDate: Date,
  direction: "prev" | "next",
): Date {
  if (viewMode === "week") {
    return direction === "prev" ? subWeeks(anchorDate, 1) : addWeeks(anchorDate, 1);
  }
  return direction === "prev" ? subMonths(anchorDate, 1) : addMonths(anchorDate, 1);
}

/**
 * カレンダーの onNavigate（react-big-calendar のツールバー操作）を次の anchorDate に変換する。
 * PREV/NEXT は navigatePeriod に委譲し、TODAY は `now` を返す。その他（DATE 等）は anchorDate を維持する。
 */
export function resolveAnchorDate(
  viewMode: CalendarViewMode,
  anchorDate: Date,
  action: string,
  now: Date,
): Date {
  if (action === "TODAY") return now;
  if (action === "PREV") return navigatePeriod(viewMode, anchorDate, "prev");
  if (action === "NEXT") return navigatePeriod(viewMode, anchorDate, "next");
  return anchorDate;
}
