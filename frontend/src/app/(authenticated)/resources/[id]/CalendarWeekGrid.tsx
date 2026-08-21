"use client";

import Link from "next/link";
import { getWeekCellHref, type HourSlotStatus } from "./calendar-logic";

interface CalendarWeekGridProps {
  weekStart: Date;
  slots: HourSlotStatus[];
  resourceId: string;
}

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * 週表示グリッド（7日 × 24時間）。
 * slots は buildWeekSlots が day(0〜6)・hour(0〜23)の順に生成した168件を前提とする。
 */
export function CalendarWeekGrid({ weekStart, slots, resourceId }: CalendarWeekGridProps) {
  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[720px] grid-cols-[3rem_repeat(7,1fr)]">
        <div className="border-b border-r bg-muted/40" />
        {days.map((date, dayIndex) => (
          <div
            key={dayIndex}
            className="border-b border-r bg-muted/40 px-1 py-2 text-center text-xs font-medium last:border-r-0"
          >
            {WEEKDAY_LABELS[dayIndex]} {date.getMonth() + 1}/{date.getDate()}
          </div>
        ))}

        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-r px-1 py-1 text-right text-xs text-muted-foreground">
              {hour}:00
            </div>
            {days.map((_, dayIndex) => {
              const cell = slots[dayIndex * 24 + hour];
              const href = getWeekCellHref(cell, resourceId);
              const testId = `calendar-week-cell-${dayIndex}-${hour}`;

              if (href === null) {
                return (
                  <div
                    key={dayIndex}
                    data-testid={testId}
                    className="border-b border-r bg-muted px-1 py-1 text-center text-[10px] text-muted-foreground last:border-r-0"
                  >
                    予約済
                  </div>
                );
              }

              return (
                <Link
                  key={dayIndex}
                  href={href}
                  data-testid={testId}
                  className="border-b border-r px-1 py-1 text-center text-[10px] hover:bg-accent last:border-r-0"
                >
                  空き
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
