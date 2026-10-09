import { describe, it, expect } from "vitest";
import {
  getWeekRange,
  getMonthRange,
  getDisplayRange,
  toApiDateTimeString,
  navigatePeriod,
  resolveAnchorDate,
} from "@/lib/calendar/period";

describe("getWeekRange", () => {
  it("週の範囲を月曜 0:00 〜 日曜 23:59:59.999 として返す", () => {
    // 2026-10-01 は木曜日
    const { start, end } = getWeekRange(new Date(2026, 9, 1));
    expect(start.getDay()).toBe(1); // 月曜
    expect(start.getDate()).toBe(28); // 2026-09-28（月）
    expect(end.getDay()).toBe(0); // 日曜
    expect(end.getDate()).toBe(4); // 2026-10-04（日）
    expect(end.getHours()).toBe(23);
  });

  it("基準日が月曜日の場合、その日自身が週の開始日になる", () => {
    const monday = new Date(2026, 9, 5); // 2026-10-05 は月曜日
    const { start } = getWeekRange(monday);
    expect(start.getDate()).toBe(5);
    expect(start.getDay()).toBe(1);
  });
});

describe("getMonthRange", () => {
  it("月初・月末を含む週全体（前後月の日付を含む）を返す", () => {
    // 2026年10月: 1日は木曜日、31日は土曜日
    const { start, end } = getMonthRange(new Date(2026, 9, 15));
    // グリッド開始は9月最終週の月曜日
    expect(start.getDay()).toBe(1);
    expect(start.getMonth()).toBe(8); // September（0始まり）
    // グリッド終了は10月最終週の日曜日
    expect(end.getDay()).toBe(0);
    expect(end.getMonth()).toBe(10); // November へまたがる
  });
});

describe("getDisplayRange", () => {
  it("viewMode = week のとき getWeekRange と同じ結果を返す", () => {
    const anchor = new Date(2026, 9, 15);
    expect(getDisplayRange("week", anchor)).toEqual(getWeekRange(anchor));
  });

  it("viewMode = month のとき getMonthRange と同じ結果を返す", () => {
    const anchor = new Date(2026, 9, 15);
    expect(getDisplayRange("month", anchor)).toEqual(getMonthRange(anchor));
  });
});

describe("toApiDateTimeString", () => {
  it("TZ なしの秒まで含む ISO 文字列に変換する", () => {
    const date = new Date(Date.UTC(2026, 9, 1, 9, 30, 0));
    expect(toApiDateTimeString(date)).toBe("2026-10-01T09:30:00");
  });
});

describe("navigatePeriod", () => {
  it("週表示の prev で7日前の日付を返す", () => {
    const anchor = new Date(2026, 9, 15);
    const result = navigatePeriod("week", anchor, "prev");
    expect(result.getDate()).toBe(8);
  });

  it("週表示の next で7日後の日付を返す", () => {
    const anchor = new Date(2026, 9, 15);
    const result = navigatePeriod("week", anchor, "next");
    expect(result.getDate()).toBe(22);
  });

  it("月表示の prev で前月の同日を返す", () => {
    const anchor = new Date(2026, 9, 15);
    const result = navigatePeriod("month", anchor, "prev");
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(15);
  });

  it("月表示の next で翌月の同日を返す", () => {
    const anchor = new Date(2026, 9, 15);
    const result = navigatePeriod("month", anchor, "next");
    expect(result.getMonth()).toBe(10);
    expect(result.getDate()).toBe(15);
  });
});

describe("resolveAnchorDate", () => {
  const anchor = new Date(2026, 9, 15);
  const now = new Date(2026, 10, 1);

  it("TODAY のとき now を返す（anchorDate は無視する）", () => {
    expect(resolveAnchorDate("week", anchor, "TODAY", now)).toEqual(now);
  });

  it("PREV のとき navigatePeriod(viewMode, anchorDate, 'prev') と同じ結果を返す", () => {
    expect(resolveAnchorDate("week", anchor, "PREV", now)).toEqual(
      navigatePeriod("week", anchor, "prev"),
    );
    expect(resolveAnchorDate("month", anchor, "PREV", now)).toEqual(
      navigatePeriod("month", anchor, "prev"),
    );
  });

  it("NEXT のとき navigatePeriod(viewMode, anchorDate, 'next') と同じ結果を返す", () => {
    expect(resolveAnchorDate("week", anchor, "NEXT", now)).toEqual(
      navigatePeriod("week", anchor, "next"),
    );
    expect(resolveAnchorDate("month", anchor, "NEXT", now)).toEqual(
      navigatePeriod("month", anchor, "next"),
    );
  });

  it("PREV/NEXT/TODAY 以外（例：DATE）のときは anchorDate を変更しない", () => {
    expect(resolveAnchorDate("week", anchor, "DATE", now)).toEqual(anchor);
  });
});
