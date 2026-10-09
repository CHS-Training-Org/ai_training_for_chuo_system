import { describe, it, expect } from "vitest";
import {
  slotsToWeekEvents,
  isRangeOccupied,
  getDaysWithReservation,
  hasReservationOnDay,
  resolveSlotSelection,
} from "@/lib/calendar/availability-to-events";
import type { AvailabilitySlot } from "@/lib/types/api";

function slot(id: string, startAt: string, endAt: string): AvailabilitySlot {
  return { reservationId: id, startAt, endAt };
}

describe("slotsToWeekEvents", () => {
  it("AvailabilitySlot を start/end が Date のイベントに変換する", () => {
    const slots = [slot("r1", "2026-10-01T09:00:00", "2026-10-01T10:00:00")];
    const events = slotsToWeekEvents(slots);
    expect(events).toHaveLength(1);
    expect(events[0].reservationId).toBe("r1");
    expect(events[0].start).toEqual(new Date("2026-10-01T09:00:00"));
    expect(events[0].end).toEqual(new Date("2026-10-01T10:00:00"));
  });
});

describe("isRangeOccupied", () => {
  const slots = [slot("r1", "2026-10-01T09:00:00", "2026-10-01T10:00:00")];

  it("占有区間と完全に重なる場合は true", () => {
    expect(
      isRangeOccupied(new Date("2026-10-01T09:00:00"), new Date("2026-10-01T09:30:00"), slots),
    ).toBe(true);
  });

  it("占有区間と部分的に重なる場合は true", () => {
    expect(
      isRangeOccupied(new Date("2026-10-01T08:30:00"), new Date("2026-10-01T09:15:00"), slots),
    ).toBe(true);
  });

  it("占有区間と重ならない場合は false", () => {
    expect(
      isRangeOccupied(new Date("2026-10-01T10:30:00"), new Date("2026-10-01T11:00:00"), slots),
    ).toBe(false);
  });

  it("端が一致するだけ（終了=開始）は重なりとみなさない", () => {
    expect(
      isRangeOccupied(new Date("2026-10-01T08:00:00"), new Date("2026-10-01T09:00:00"), slots),
    ).toBe(false);
    expect(
      isRangeOccupied(new Date("2026-10-01T10:00:00"), new Date("2026-10-01T10:30:00"), slots),
    ).toBe(false);
  });

  it("占有枠が存在しない場合は常に false", () => {
    expect(
      isRangeOccupied(new Date("2026-10-01T09:00:00"), new Date("2026-10-01T09:30:00"), []),
    ).toBe(false);
  });
});

describe("getDaysWithReservation / hasReservationOnDay", () => {
  it("同日内の占有枠がある日を「予約あり」とする", () => {
    const slots = [slot("r1", "2026-10-01T09:00:00", "2026-10-01T10:00:00")];
    const days = getDaysWithReservation(slots);
    expect(hasReservationOnDay(new Date(2026, 9, 1), days)).toBe(true);
    expect(hasReservationOnDay(new Date(2026, 9, 2), days)).toBe(false);
  });

  it("日をまたぐ占有枠は開始日から終了日まで全て「予約あり」とする", () => {
    const slots = [slot("r1", "2026-10-01T22:00:00", "2026-10-03T01:00:00")];
    const days = getDaysWithReservation(slots);
    expect(hasReservationOnDay(new Date(2026, 9, 1), days)).toBe(true);
    expect(hasReservationOnDay(new Date(2026, 9, 2), days)).toBe(true);
    expect(hasReservationOnDay(new Date(2026, 9, 3), days)).toBe(true);
    expect(hasReservationOnDay(new Date(2026, 9, 4), days)).toBe(false);
  });

  it("占有枠が存在しない場合はどの日も「予約あり」にならない", () => {
    const days = getDaysWithReservation([]);
    expect(hasReservationOnDay(new Date(2026, 9, 1), days)).toBe(false);
  });
});

describe("resolveSlotSelection", () => {
  const occupiedSlots = [slot("r1", "2026-10-01T09:00:00", "2026-10-01T10:00:00")];

  it("月表示：画面遷移せず、クリックした日を anchorDate として週表示に切り替える（BR-05）", () => {
    const slotInfo = { start: new Date(2026, 9, 7), end: new Date(2026, 9, 8) };
    const result = resolveSlotSelection("month", slotInfo, occupiedSlots, "res-1");
    expect(result).toEqual({ type: "switch-to-week", anchorDate: slotInfo.start });
  });

  it("週表示：占有範囲をクリックした場合は何もしない（BR-01・二重チェック）", () => {
    const slotInfo = {
      start: new Date("2026-10-01T09:00:00"),
      end: new Date("2026-10-01T09:30:00"),
    };
    const result = resolveSlotSelection("week", slotInfo, occupiedSlots, "res-1");
    expect(result).toEqual({ type: "none" });
  });

  it("週表示：空き範囲をクリックした場合は予約申請フォームへの遷移先 URL を組み立てる", () => {
    const slotInfo = {
      start: new Date("2026-10-01T13:00:00"),
      end: new Date("2026-10-01T13:30:00"),
    };
    const result = resolveSlotSelection("week", slotInfo, occupiedSlots, "res-1");
    expect(result).toEqual({
      type: "navigate",
      href: "/reservations/new?resourceId=res-1&startAt=2026-10-01T13:00",
    });
  });

  it("週表示：占有枠が存在しない場合は常に navigate を返す", () => {
    const slotInfo = {
      start: new Date("2026-10-02T09:00:00"),
      end: new Date("2026-10-02T09:30:00"),
    };
    const result = resolveSlotSelection("week", slotInfo, [], "res-2");
    expect(result).toEqual({
      type: "navigate",
      href: "/reservations/new?resourceId=res-2&startAt=2026-10-02T09:00",
    });
  });
});
