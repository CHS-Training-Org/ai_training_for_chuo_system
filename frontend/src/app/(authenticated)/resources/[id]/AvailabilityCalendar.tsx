"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAvailabilityAction } from "@/server/actions/resources";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot } from "@/lib/types/api";

/**
 * リソース詳細画面の空き状況カレンダー（screen-spec.md §`/resources/{id}` 準拠）。
 *
 * 週表示（月曜始まり、8:00〜20:00 の1時間単位グリッド）・月表示を切り替えられる。
 * 占有判定は既存バックエンド（ResourceService#availability）と同じ半開区間
 * `[start, end)` の重なりで行う（隣接区間は重ならない扱い）。
 */

type CalendarMode = "week" | "month";

const WEEK_HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8時〜19時（各セル1時間幅）
const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

interface AvailabilityCalendarProps {
  resourceId: string;
  isActive: boolean;
}

export function AvailabilityCalendar({ resourceId, isActive }: AvailabilityCalendarProps) {
  const router = useRouter();
  const [mode, setMode] = useState<CalendarMode>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = mode === "week" ? getWeekRange(anchorDate) : getMonthRange(anchorDate);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getAvailabilityAction(resourceId, toQueryDateTime(from), toQueryDateTime(to))
      .then((result) => {
        if (!cancelled) setSlots(result);
      })
      .catch(() => {
        // 取得失敗時は直前のデータを保持する（空扱いに戻すと実際には空いていない
        // 枠が一時的に空きとして見えてしまうため）。
        if (!cancelled) setError("空き状況を取得できませんでした。");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, from.getTime(), to.getTime()]);

  const handlePrev = useCallback(() => {
    setAnchorDate((current) => (mode === "week" ? addDays(current, -7) : addMonths(current, -1)));
  }, [mode]);

  const handleNext = useCallback(() => {
    setAnchorDate((current) => (mode === "week" ? addDays(current, 7) : addMonths(current, 1)));
  }, [mode]);

  const handleCellClick = useCallback(
    (startAt: Date) => {
      if (!isActive) return;
      const params = new URLSearchParams({
        resourceId,
        startAt: toDateTimeLocal(startAt),
      });
      router.push(`/reservations/new?${params.toString()}`);
    },
    [isActive, resourceId, router],
  );

  return (
    <section className="space-y-3" data-testid="availability-calendar">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">空き状況</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={mode === "week" ? "default" : "outline"}
            size="sm"
            data-testid="availability-calendar-mode-week"
            onClick={() => setMode("week")}
          >
            週表示
          </Button>
          <Button
            type="button"
            variant={mode === "month" ? "default" : "outline"}
            size="sm"
            data-testid="availability-calendar-mode-month"
            onClick={() => setMode("month")}
          >
            月表示
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="availability-calendar-prev"
          onClick={handlePrev}
          disabled={isLoading}
        >
          {mode === "week" ? "前週" : "前月"}
        </Button>
        <p
          className="text-sm text-muted-foreground"
          data-testid="availability-calendar-period-label"
        >
          {mode === "week"
            ? `${from.toLocaleDateString("ja-JP")} 〜 ${addDays(to, -1).toLocaleDateString("ja-JP")}`
            : `${from.getFullYear()}年${from.getMonth() + 1}月`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="availability-calendar-next"
          onClick={handleNext}
          disabled={isLoading}
        >
          {mode === "week" ? "次週" : "次月"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="availability-calendar-error">
          {error}
        </p>
      )}

      {mode === "week" ? (
        <WeekGrid
          weekStart={from}
          slots={slots}
          isActive={isActive}
          onCellClick={handleCellClick}
        />
      ) : (
        <MonthGrid
          monthStart={from}
          slots={slots}
          isActive={isActive}
          onCellClick={handleCellClick}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 週表示グリッド
// ---------------------------------------------------------------------------

function WeekGrid({
  weekStart,
  slots,
  isActive,
  onCellClick,
}: {
  weekStart: Date;
  slots: AvailabilitySlot[];
  isActive: boolean;
  onCellClick: (startAt: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div
      className="overflow-x-auto rounded-lg border"
      data-testid="availability-calendar-week-grid"
    >
      <div className="grid min-w-160 grid-cols-8 text-xs">
        <div className="border-b border-r p-2" />
        {days.map((day, i) => (
          <div key={day.toISOString()} className="border-b p-2 text-center font-medium">
            {day.getMonth() + 1}/{day.getDate()} ({WEEKDAY_LABELS[i]})
          </div>
        ))}
        {WEEK_HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-b border-r p-2 text-right text-muted-foreground">{hour}:00</div>
            {days.map((day) => {
              const cellStart = atHour(day, hour);
              const cellEnd = atHour(day, hour + 1);
              const occupied = isOverlappingAny(cellStart, cellEnd, slots);
              return (
                <button
                  key={`${day.toISOString()}-${hour}`}
                  type="button"
                  data-testid="availability-calendar-week-cell"
                  disabled={occupied || !isActive}
                  onClick={() => onCellClick(cellStart)}
                  aria-label={`${day.getMonth() + 1}月${day.getDate()}日 ${hour}:00`}
                  className={cn(
                    "h-8 border-b text-center",
                    occupied || !isActive
                      ? "cursor-not-allowed bg-muted text-muted-foreground"
                      : "cursor-pointer hover:bg-accent",
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 月表示グリッド
// ---------------------------------------------------------------------------

function MonthGrid({
  monthStart,
  slots,
  isActive,
  onCellClick,
}: {
  monthStart: Date;
  slots: AvailabilitySlot[];
  isActive: boolean;
  onCellClick: (startAt: Date) => void;
}) {
  const cells = buildMonthCells(monthStart);

  return (
    <div className="rounded-lg border" data-testid="availability-calendar-month-grid">
      <div className="grid grid-cols-7 text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="border-b p-2 text-center font-medium">
            {label}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) {
            return <div key={`blank-${i}`} className="border-b p-2" />;
          }
          const businessStart = atHour(date, 8);
          const businessEnd = atHour(date, 20);
          const overlapping = slots
            .map((s) => [new Date(s.startAt), new Date(s.endAt)] as const)
            .filter(([s, e]) => isOverlapping(businessStart, businessEnd, s, e));
          const occupied = isFullyCovered(businessStart, businessEnd, overlapping);

          return (
            <button
              key={date.toISOString()}
              type="button"
              data-testid="availability-calendar-month-cell"
              disabled={occupied || !isActive}
              onClick={() => onCellClick(atHour(date, 9))}
              aria-label={`${date.getMonth() + 1}月${date.getDate()}日`}
              className={cn(
                "h-16 border-b p-1 text-left align-top",
                occupied || !isActive
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "cursor-pointer hover:bg-accent",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 日時計算ヘルパー（business-logic-model.md 準拠。日付計算ライブラリは導入しない）
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function atHour(date: Date, hour: number): Date {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** 月曜始まりの週の開始日（00:00）を返す。 */
function getWeekStart(date: Date): Date {
  const day = date.getDay(); // 0=日, 1=月, ..., 6=土
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), diffToMonday);
}

function getWeekRange(anchorDate: Date): { from: Date; to: Date } {
  const from = getWeekStart(anchorDate);
  return { from, to: addDays(from, 7) };
}

function getMonthRange(anchorDate: Date): { from: Date; to: Date } {
  const from = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const to = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1);
  return { from, to };
}

/** 当月の日付セル配列（前後月の空白セルを含み、7の倍数になるよう整形する）。 */
function buildMonthCells(monthStart: Date): (Date | null)[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlankCount = (monthStart.getDay() + 6) % 7; // 月曜始まりオフセット

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlankCount; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** 半開区間 [aStart, aEnd) と [bStart, bEnd) が重なるかどうか。隣接区間は重ならない。 */
function isOverlapping(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isOverlappingAny(cellStart: Date, cellEnd: Date, slots: AvailabilitySlot[]): boolean {
  return slots.some((s) =>
    isOverlapping(cellStart, cellEnd, new Date(s.startAt), new Date(s.endAt)),
  );
}

/** 指定区間 [target.start, target.end) が occupiedRanges で隙間なく覆われているか。 */
function isFullyCovered(
  targetStart: Date,
  targetEnd: Date,
  occupiedRanges: readonly (readonly [Date, Date])[],
): boolean {
  if (occupiedRanges.length === 0) return false;

  const clipped = occupiedRanges
    .map(([s, e]) => [s < targetStart ? targetStart : s, e > targetEnd ? targetEnd : e] as const)
    .sort((a, b) => a[0].getTime() - b[0].getTime());

  let coveredUntil = targetStart;
  for (const [start, end] of clipped) {
    if (start > coveredUntil) return false; // 隙間がある
    if (end > coveredUntil) coveredUntil = end;
  }
  return coveredUntil >= targetEnd;
}

/** API への照会用（既存の `toISOString().slice(0, 19)` パターンを踏襲）。 */
function toQueryDateTime(date: Date): string {
  return date.toISOString().slice(0, 19);
}

/** `datetime-local` 入力欄用（`YYYY-MM-DDTHH:mm` 形式）。 */
function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
