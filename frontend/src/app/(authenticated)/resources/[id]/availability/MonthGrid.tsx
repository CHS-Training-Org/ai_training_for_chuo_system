import Link from "next/link";
import type { AvailabilitySlot } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { buildCalendarHref, countReservationsOnDay } from "./calendar-utils";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * 月表示の日セルグリッド。各セルにその日の予約件数を表示し、
 * クリックするとその日を含む週表示へ移動する（月表示では枠の予約はできない）。
 */
export function MonthGrid({
  resourceId,
  weeks,
  month,
  slots,
}: {
  resourceId: string;
  /** 月曜始まりの週ごとの日付（`YYYY-MM-DD`）。前後の月の日を含む */
  weeks: string[][];
  /** 表示月（`YYYY-MM`） */
  month: string;
  slots: AvailabilitySlot[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] table-fixed border-collapse text-xs">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col" className="border-b p-1 font-medium">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const outside = !day.startsWith(month);
                const count = countReservationsOnDay(slots, day);
                return (
                  <td
                    key={day}
                    data-testid={`day-${day}`}
                    data-outside-month={outside ? "true" : undefined}
                    className={cn("border p-0", outside && "bg-muted/30 text-muted-foreground")}
                  >
                    <Link
                      href={buildCalendarHref(resourceId, "week", day)}
                      aria-label={`${day} の週を表示${count > 0 ? `（予約 ${count} 件）` : ""}`}
                      className="block h-16 p-1 hover:bg-muted/50"
                    >
                      <span className="block">{Number(day.slice(8, 10))}</span>
                      {count > 0 && (
                        <span className="mt-1 block rounded bg-muted-foreground/30 px-1 text-center text-foreground">
                          {count}件
                        </span>
                      )}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
