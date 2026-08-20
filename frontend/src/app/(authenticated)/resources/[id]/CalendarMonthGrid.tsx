"use client";

import { cn } from "@/lib/utils";
import type { DaySummary } from "./calendar-logic";

interface CalendarMonthGridProps {
  days: DaySummary[];
  onDayClick: (date: Date) => void;
}

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * 月表示グリッド（日単位の要約セル、BR-06）。
 * 日セルのクリックは週表示への切り替えのみを行う（BR-07。予約申請フォームへの遷移はしない）。
 */
export function CalendarMonthGrid({ days, onDayClick }: CalendarMonthGridProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[560px] grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-b border-r bg-muted/40 px-1 py-2 text-center text-xs font-medium last:border-r-0"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const testId = `calendar-month-day-${day.date.getFullYear()}-${String(
            day.date.getMonth() + 1,
          ).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
          return (
            <button
              key={testId}
              type="button"
              data-testid={testId}
              onClick={() => onDayClick(day.date)}
              className={cn(
                "flex h-20 flex-col items-start gap-1 border-b border-r p-1 text-left text-xs last:border-r-0 hover:bg-accent",
                !day.isCurrentMonth && "text-muted-foreground/50",
                day.reservationCount > 0 && "bg-muted",
              )}
            >
              <span>{day.date.getDate()}</span>
              <span className="text-[10px] text-muted-foreground">
                {day.reservationCount > 0 ? `予約 ${day.reservationCount}件` : "空き"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
