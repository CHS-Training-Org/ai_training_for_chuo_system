"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { getAvailabilityAction } from "@/server/actions/resources";
import type { AvailabilitySlot } from "@/lib/types/api";
import { CalendarToolbar } from "./CalendarToolbar";
import { CalendarWeekGrid } from "./CalendarWeekGrid";
import { CalendarMonthGrid } from "./CalendarMonthGrid";
import {
  buildMonthDays,
  buildWeekSlots,
  computePeriod,
  formatPeriodLabel,
  shiftAnchorDate,
  type CalendarViewMode,
} from "./calendar-logic";

interface ResourceAvailabilityCalendarProps {
  resourceId: string;
}

/**
 * リソース詳細画面のカレンダー本体（週表示・月表示、期間ナビゲーション）。
 * 表示期間が変わるたびに getAvailabilityAction を呼び直す（RSV-04、BR-10）。
 */
export function ResourceAvailabilityCalendar({ resourceId }: ResourceAvailabilityCalendarProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isPending, startTransition] = useTransition();

  const period = computePeriod(viewMode, anchorDate);
  const periodFromTime = period.from.getTime();
  const periodToTime = period.to.getTime();

  useEffect(() => {
    const from = new Date(periodFromTime).toISOString().slice(0, 19);
    const to = new Date(periodToTime).toISOString().slice(0, 19);
    startTransition(async () => {
      try {
        const result = await getAvailabilityAction(resourceId, from, to);
        setSlots(result);
      } catch {
        setSlots([]);
      }
    });
  }, [resourceId, periodFromTime, periodToTime]);

  const handlePrev = useCallback(() => {
    setAnchorDate((current) => shiftAnchorDate(viewMode, current, "prev"));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setAnchorDate((current) => shiftAnchorDate(viewMode, current, "next"));
  }, [viewMode]);

  const handleDayClick = useCallback((date: Date) => {
    setAnchorDate(date);
    setViewMode("week");
  }, []);

  return (
    <section className="space-y-3" aria-busy={isPending}>
      <h2 className="text-lg font-semibold">カレンダー</h2>
      <CalendarToolbar
        viewMode={viewMode}
        periodLabel={formatPeriodLabel(viewMode, period)}
        onViewModeChange={setViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
      />
      {viewMode === "week" ? (
        <CalendarWeekGrid
          weekStart={period.from}
          slots={buildWeekSlots(period.from, slots)}
          resourceId={resourceId}
        />
      ) : (
        <CalendarMonthGrid days={buildMonthDays(anchorDate, slots)} onDayClick={handleDayClick} />
      )}
    </section>
  );
}
