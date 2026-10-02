"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, type SlotInfo, type View } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { getAvailabilityAction } from "@/server/actions/resources";
import type { AvailabilitySlot } from "@/lib/types/api";
import {
  type CalendarViewMode,
  getDisplayRange,
  navigatePeriod,
  toApiDateTimeString,
} from "@/lib/calendar/period";
import {
  getDaysWithReservation,
  hasReservationOnDay,
  isRangeOccupied,
  slotsToWeekEvents,
} from "@/lib/calendar/availability-to-events";

/**
 * リソース詳細画面の空き状況カレンダー（calendar-view ユニット）。
 *
 * 週表示（30分単位の時間グリッド）・月表示（日単位の予約有無）を切り替えられる。
 * 週表示の空き枠クリック（またはドラッグ選択）で、選択した開始日時を引き継いで予約申請
 * フォームへ遷移する。月表示の日セルクリックでは、その日を含む週表示へ遷移する
 * （business-rules.md BR-01〜BR-07 準拠）。
 */

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { ja },
});

const CALENDAR_MESSAGES = {
  today: "今日",
  previous: "前へ",
  next: "次へ",
  month: "月",
  week: "週",
  date: "日付",
  time: "時間",
  event: "予約",
  noEventsInRange: "この期間に予約はありません。",
  showMore: (total: number) => `他 ${total} 件`,
};

export function ResourceAvailabilityCalendar({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = getDisplayRange(viewMode, anchorDate);

    getAvailabilityAction(resourceId, toApiDateTimeString(start), toApiDateTimeString(end))
      .then((result) => {
        if (!cancelled) {
          setSlots(result);
          setHasError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setHasError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resourceId, viewMode, anchorDate]);

  const weekEvents = viewMode === "week" ? slotsToWeekEvents(slots) : [];
  const daysWithReservation = viewMode === "month" ? getDaysWithReservation(slots) : null;

  const handleNavigate = useCallback(
    (_newDate: Date, _view: View, action: string) => {
      if (action === "TODAY") {
        setAnchorDate(new Date());
      } else if (action === "PREV") {
        setAnchorDate((prev) => navigatePeriod(viewMode, prev, "prev"));
      } else if (action === "NEXT") {
        setAnchorDate((prev) => navigatePeriod(viewMode, prev, "next"));
      }
    },
    [viewMode],
  );

  const handleViewChange = useCallback((nextView: View) => {
    if (nextView === "week" || nextView === "month") {
      setViewMode(nextView);
    }
  }, []);

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (viewMode === "month") {
        // 月表示の日セルクリック：画面遷移せず、その日を含む週の週表示に切り替える（BR-05）
        setAnchorDate(slotInfo.start);
        setViewMode("week");
        return;
      }
      // 週表示：予約済みの枠はクリック不可（BR-01・念のための二重チェック）
      if (isRangeOccupied(slotInfo.start, slotInfo.end, slots)) {
        return;
      }
      const startAt = format(slotInfo.start, "yyyy-MM-dd'T'HH:mm");
      router.push(`/reservations/new?resourceId=${resourceId}&startAt=${startAt}`);
    },
    [viewMode, slots, resourceId, router],
  );

  return (
    <section className="space-y-3" data-testid="resource-availability-calendar">
      <h2 className="text-lg font-semibold">空き状況カレンダー</h2>
      {hasError && (
        <p className="text-sm text-destructive" data-testid="availability-calendar-error">
          空き状況の取得に失敗しました。
        </p>
      )}
      <div style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          culture="ja"
          messages={CALENDAR_MESSAGES}
          events={weekEvents}
          view={viewMode}
          views={["week", "month"]}
          date={anchorDate}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          selectable
          onSelectSlot={handleSelectSlot}
          step={30}
          timeslots={2}
          startAccessor="start"
          endAccessor="end"
          eventPropGetter={() => ({ className: "calendar-event-occupied" })}
          dayPropGetter={(date) =>
            viewMode === "month" &&
            daysWithReservation !== null &&
            hasReservationOnDay(date, daysWithReservation)
              ? { className: "calendar-day-has-reservation" }
              : {}
          }
        />
      </div>
    </section>
  );
}
