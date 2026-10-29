import type { AvailabilitySlot } from "@/lib/types/api";
import { CalendarToolbar } from "./CalendarToolbar";
import { MonthGrid } from "./MonthGrid";
import { WeekGrid } from "./WeekGrid";
import { formatPeriodLabel, getMonthGrid, getWeekRange, type CalendarView } from "./calendar-utils";

/**
 * 空き状況カレンダー（週表示・月表示の振り分け）。Server Component。
 * 空き状況の取得に失敗した場合（`error`）は、ツールバーを残してメッセージを表示する。
 */
export function AvailabilityCalendar({
  resourceId,
  view,
  date,
  slots,
  isActive,
  now,
  error,
}: {
  resourceId: string;
  view: CalendarView;
  date: string;
  slots: AvailabilitySlot[];
  isActive: boolean;
  /** 現在時刻の壁時計文字列（Asia/Tokyo） */
  now: string;
  error: boolean;
}) {
  return (
    <div className="space-y-3">
      <CalendarToolbar
        resourceId={resourceId}
        view={view}
        date={date}
        today={now.slice(0, 10)}
        label={formatPeriodLabel(view, date)}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          空き状況を取得できませんでした。時間をおいて再度お試しください。
        </p>
      ) : view === "month" ? (
        <MonthGrid resourceId={resourceId} {...getMonthGrid(date)} slots={slots} />
      ) : (
        <WeekGrid
          resourceId={resourceId}
          days={getWeekRange(date).days}
          slots={slots}
          now={now}
          isActive={isActive}
        />
      )}
    </div>
  );
}
