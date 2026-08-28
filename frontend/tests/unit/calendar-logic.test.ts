/**
 * calendar-logic.ts（カレンダービューの純粋関数群）のユニットテスト。
 *
 * コンポーネントのレンダリング・クリックテストは既存の resource-filter-form.test.ts と
 * 同じ方針で行わない（jsdomでのインタラクション検証が不安定なため）。
 * クリック可否の決定は getWeekCellHref に一元化しており、ここで直接検証する。
 */
import { describe, it, expect } from "vitest";
import {
  computePeriod,
  shiftAnchorDate,
  formatPeriodLabel,
  formatLocalDateTime,
  buildWeekSlots,
  buildMonthDays,
  getWeekCellHref,
  type HourSlotStatus,
} from "@/app/(authenticated)/resources/[id]/calendar-logic";
import type { AvailabilitySlot } from "@/lib/types/api";

function slot(reservationId: string, startAt: string, endAt: string): AvailabilitySlot {
  return { reservationId, startAt, endAt };
}

describe("computePeriod", () => {
  describe("week", () => {
    it("アンカー日付が週の途中（木曜）の場合、月曜0時〜翌週月曜0時を返す", () => {
      const period = computePeriod("week", new Date(2026, 7, 20)); // 2026-08-20 木曜
      expect(period.from).toEqual(new Date(2026, 7, 17));
      expect(period.to).toEqual(new Date(2026, 7, 24));
    });

    it("アンカー日付が月曜自身の場合、その日を起点にする", () => {
      const period = computePeriod("week", new Date(2026, 7, 17)); // 月曜
      expect(period.from).toEqual(new Date(2026, 7, 17));
      expect(period.to).toEqual(new Date(2026, 7, 24));
    });

    it("アンカー日付が日曜（週の最終日）の場合、前の月曜を起点にする", () => {
      const period = computePeriod("week", new Date(2026, 7, 23)); // 日曜
      expect(period.from).toEqual(new Date(2026, 7, 17));
      expect(period.to).toEqual(new Date(2026, 7, 24));
    });
  });

  describe("month", () => {
    it("月初〜翌月月初を半開区間で返す", () => {
      const period = computePeriod("month", new Date(2026, 7, 17));
      expect(period.from).toEqual(new Date(2026, 7, 1));
      expect(period.to).toEqual(new Date(2026, 8, 1));
    });

    it("年をまたぐ月（12月）でも翌年1月1日を返す", () => {
      const period = computePeriod("month", new Date(2026, 11, 15));
      expect(period.from).toEqual(new Date(2026, 11, 1));
      expect(period.to).toEqual(new Date(2027, 0, 1));
    });
  });
});

describe("shiftAnchorDate", () => {
  it("週表示の次週は7日後", () => {
    expect(shiftAnchorDate("week", new Date(2026, 7, 17), "next")).toEqual(new Date(2026, 7, 24));
  });

  it("週表示の前週は7日前", () => {
    expect(shiftAnchorDate("week", new Date(2026, 7, 17), "prev")).toEqual(new Date(2026, 7, 10));
  });

  it("月表示の次月は、日数の少ない月をまたいでも1か月分しか進まない（月初へ正規化してから加算）", () => {
    // 1月31日を素朴に1か月進めると2月は28日までしかないため3月にロールオーバーしてしまう
    const result = shiftAnchorDate("month", new Date(2026, 0, 31), "next");
    expect(result).toEqual(new Date(2026, 1, 1));
  });

  it("月表示の前月は年をまたいでも正しく1年前の12月になる", () => {
    const result = shiftAnchorDate("month", new Date(2026, 0, 1), "prev");
    expect(result).toEqual(new Date(2025, 11, 1));
  });
});

describe("formatPeriodLabel", () => {
  it("週表示は開始日〜終了日（当該週の日曜）を返す", () => {
    const period = computePeriod("week", new Date(2026, 7, 17));
    expect(formatPeriodLabel("week", period)).toBe("2026/8/17 〜 2026/8/23");
  });

  it("月表示は年月のみを返す", () => {
    const period = computePeriod("month", new Date(2026, 7, 17));
    expect(formatPeriodLabel("month", period)).toBe("2026年8月");
  });
});

describe("formatLocalDateTime", () => {
  it("ローカル日時をYYYY-MM-DDTHH:mm:ss形式へ整形する（toISOStringのUTC変換を避ける）", () => {
    expect(formatLocalDateTime(new Date(2026, 7, 20, 9, 5, 3))).toBe("2026-08-20T09:05:03");
  });

  it("月・日・時・分・秒が1桁の値も2桁ゼロ埋めする", () => {
    expect(formatLocalDateTime(new Date(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01T00:00:00");
  });

  it("computePeriodが返す期間の境界（週表示）をローカル日時として整形できる", () => {
    const period = computePeriod("week", new Date(2026, 7, 20));
    expect(formatLocalDateTime(period.from)).toBe("2026-08-17T00:00:00");
    expect(formatLocalDateTime(period.to)).toBe("2026-08-24T00:00:00");
  });
});

describe("buildWeekSlots", () => {
  const weekStart = new Date(2026, 7, 17); // 月曜

  it("予約がない場合、168セルすべてが空きになる", () => {
    const slots = buildWeekSlots(weekStart, []);
    expect(slots).toHaveLength(7 * 24);
    expect(slots.every((s) => !s.occupied && s.reservationId === null)).toBe(true);
  });

  it("1時間枠と境界が一致する予約は、その1セルのみを占有済みにする", () => {
    const slots = buildWeekSlots(weekStart, [
      slot("r1", "2026-08-17T14:00:00", "2026-08-17T15:00:00"),
    ]);
    const cell = (hour: number) => slots.find((s) => s.hour === hour && s.date.getDate() === 17);

    expect(cell(14)?.occupied).toBe(true);
    expect(cell(14)?.reservationId).toBe("r1");
    expect(cell(13)?.occupied).toBe(false);
    expect(cell(15)?.occupied).toBe(false);
  });

  it("境界に一致しない予約（14:30〜15:30）は、重複する両方のセル（14-15時・15-16時）を占有済みにする", () => {
    const slots = buildWeekSlots(weekStart, [
      slot("r2", "2026-08-18T14:30:00", "2026-08-18T15:30:00"),
    ]);
    const cell = (hour: number) => slots.find((s) => s.hour === hour && s.date.getDate() === 18);

    expect(cell(14)?.occupied).toBe(true);
    expect(cell(15)?.occupied).toBe(true);
    expect(cell(13)?.occupied).toBe(false);
    expect(cell(16)?.occupied).toBe(false);
  });
});

describe("buildMonthDays", () => {
  it("月初が月曜でない月は、前月の日付を含む完全な週から始まる", () => {
    // 2026年8月1日は土曜日のため、グリッドは7月27日（月曜）から始まる
    const days = buildMonthDays(new Date(2026, 7, 17), []);

    expect(days[0].date).toEqual(new Date(2026, 6, 27));
    expect(days[0].isCurrentMonth).toBe(false);
  });

  it("末日を含む週が翌月にまたがる場合、翌月の日付を含む", () => {
    // 2026年8月31日は月曜日のため、グリッドは9月6日（日曜）まで含む
    const days = buildMonthDays(new Date(2026, 7, 17), []);

    expect(days[days.length - 1].date).toEqual(new Date(2026, 8, 6));
    expect(days[days.length - 1].isCurrentMonth).toBe(false);
  });

  it("当月の日付はisCurrentMonthがtrueになる", () => {
    const days = buildMonthDays(new Date(2026, 7, 17), []);
    const aug1 = days.find((d) => d.date.getTime() === new Date(2026, 7, 1).getTime());
    expect(aug1?.isCurrentMonth).toBe(true);
  });

  it("同じ日に重複する複数の予約は件数として集計される", () => {
    const days = buildMonthDays(new Date(2026, 7, 17), [
      slot("r1", "2026-08-01T09:00:00", "2026-08-01T10:00:00"),
      slot("r2", "2026-08-01T14:00:00", "2026-08-01T15:00:00"),
    ]);
    const aug1 = days.find((d) => d.date.getTime() === new Date(2026, 7, 1).getTime());
    expect(aug1?.reservationCount).toBe(2);

    const aug2 = days.find((d) => d.date.getTime() === new Date(2026, 7, 2).getTime());
    expect(aug2?.reservationCount).toBe(0);
  });
});

describe("getWeekCellHref", () => {
  const resourceId = "11111111-1111-1111-1111-111111111111";
  const freeCell: HourSlotStatus = {
    date: new Date(2026, 7, 20),
    hour: 9,
    occupied: false,
    reservationId: null,
  };
  const occupiedCell: HourSlotStatus = {
    date: new Date(2026, 7, 20),
    hour: 14,
    occupied: true,
    reservationId: "r1",
  };

  it("空きセルは予約申請フォームへの遷移URLを返す", () => {
    const href = getWeekCellHref(freeCell, resourceId);
    expect(href).toBe(`/reservations/new?resourceId=${resourceId}&startAt=2026-08-20T09%3A00`);
  });

  it("占有済みセルはnullを返す（クリック不可）", () => {
    expect(getWeekCellHref(occupiedCell, resourceId)).toBeNull();
  });

  it("境界不一致で占有扱いになったセルもnullを返す", () => {
    const boundaryMismatchCell: HourSlotStatus = {
      date: new Date(2026, 7, 18),
      hour: 15,
      occupied: true,
      reservationId: "r2",
    };
    expect(getWeekCellHref(boundaryMismatchCell, resourceId)).toBeNull();
  });

  it("過去日時の空きセルもnullにせず遷移URLを返す（本課題側では過去判定をしない）", () => {
    const pastFreeCell: HourSlotStatus = {
      date: new Date(2020, 0, 1),
      hour: 9,
      occupied: false,
      reservationId: null,
    };
    expect(getWeekCellHref(pastFreeCell, resourceId)).not.toBeNull();
  });
});
