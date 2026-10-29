import Link from "next/link";
import type { AvailabilitySlot } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  buildReservationHref,
  getSlotState,
  slotRange,
  type SlotState,
} from "./calendar-utils";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

const DISABLED_LABELS: Record<Exclude<SlotState, "available">, string> = {
  booked: "予約済み",
  inactive: "予約不可",
  past: "終了",
};

/**
 * 週表示の時間グリッド（8:00〜20:00 の 1 時間枠 × 7 日）。
 * 枠の状態は {@link getSlotState} で決め、空き枠だけが予約申請フォームへのリンクになる。
 * 状態は色だけでなく文字・`aria-label`・`data-state` でも示す。
 */
export function WeekGrid({
  resourceId,
  days,
  slots,
  now,
  isActive,
}: {
  resourceId: string;
  /** 月曜から日曜の 7 日（`YYYY-MM-DD`） */
  days: string[];
  slots: AvailabilitySlot[];
  /** 現在時刻の壁時計文字列（Asia/Tokyo） */
  now: string;
  isActive: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-12 border-b p-1" />
            {days.map((day, i) => (
              <th key={day} scope="col" className="border-b p-1 font-medium">
                {Number(day.slice(5, 7))}/{Number(day.slice(8, 10))}（{WEEKDAYS[i]}）
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <th scope="row" className="border-b p-1 text-right font-normal text-muted-foreground">
                {hour}:00
              </th>
              {days.map((day) => {
                const { start, end } = slotRange(day, hour);
                const state = getSlotState({ slots, start, end, now, isActive });
                const label = `${day} ${hour}:00〜${hour + 1}:00`;
                return (
                  <td key={day} className="border-b border-l p-0.5">
                    {state === "available" ? (
                      <div
                        data-testid={`slot-${day}T${String(hour).padStart(2, "0")}`}
                        data-state={state}
                      >
                        <Link
                          href={buildReservationHref(resourceId, day, hour)}
                          aria-label={`${label} 空き。予約申請へ`}
                          className="block h-8 rounded bg-primary/10 text-center leading-8 text-primary hover:bg-primary/20"
                        >
                          空き
                        </Link>
                      </div>
                    ) : (
                      <div
                        data-testid={`slot-${day}T${String(hour).padStart(2, "0")}`}
                        data-state={state}
                        aria-disabled="true"
                        aria-label={`${label} ${DISABLED_LABELS[state]}`}
                        className={cn(
                          "h-8 rounded text-center leading-8",
                          state === "booked"
                            ? "bg-muted-foreground/30 text-foreground"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {state === "booked" ? DISABLED_LABELS.booked : ""}
                      </div>
                    )}
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
