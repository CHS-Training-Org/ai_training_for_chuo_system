import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildCalendarHref, shiftDate, type CalendarView } from "./calendar-utils";

/**
 * 空き状況カレンダーのツールバー（前へ・今日・次へ、週/月の切り替え）。
 * 状態は URL のクエリパラメータで持つため、全て `<Link>` で表現する。
 */
export function CalendarToolbar({
  resourceId,
  view,
  date,
  today,
  label,
}: {
  resourceId: string;
  view: CalendarView;
  date: string;
  /** 「今日」の移動先（`YYYY-MM-DD`、Asia/Tokyo） */
  today: string;
  /** 表示中の期間の見出し */
  label: string;
}) {
  const href = (v: CalendarView, d: string) => buildCalendarHref(resourceId, v, d);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="sm">
          <Link href={href(view, shiftDate(date, view, -1))}>前へ</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={href(view, today)}>今日</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={href(view, shiftDate(date, view, 1))}>次へ</Link>
        </Button>
      </div>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-1">
        <Button asChild variant={view === "week" ? "default" : "outline"} size="sm">
          <Link href={href("week", date)} aria-current={view === "week" ? "true" : undefined}>
            週
          </Link>
        </Button>
        <Button asChild variant={view === "month" ? "default" : "outline"} size="sm">
          <Link href={href("month", date)} aria-current={view === "month" ? "true" : undefined}>
            月
          </Link>
        </Button>
      </div>
    </div>
  );
}
