import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  buildReservationHref,
  countReservationsOnDay,
  getMonthGrid,
  getSlotState,
  getWeekRange,
  isOccupied,
  nowInTokyo,
  parseCalendarParams,
  shiftDate,
  slotRange,
} from "@/app/(authenticated)/resources/[id]/availability/calendar-utils";

const slot = (startAt: string, endAt: string, reservationId = "r1") => ({
  reservationId,
  startAt,
  endAt,
});

describe("定数", () => {
  it("表示時間帯は 8:00 から 20:00", () => {
    expect(DAY_START_HOUR).toBe(8);
    expect(DAY_END_HOUR).toBe(20);
  });
});

describe("nowInTokyo", () => {
  it("UTC の時刻を Asia/Tokyo の壁時計文字列にする（日付をまたぐ）", () => {
    expect(nowInTokyo(new Date("2026-10-15T20:00:00Z"))).toBe("2026-10-16T05:00:00");
  });

  it("日本時間の 0 時は 00 時として表す（24 時にならない）", () => {
    expect(nowInTokyo(new Date("2026-10-15T15:00:00Z"))).toBe("2026-10-16T00:00:00");
  });
});

describe("parseCalendarParams", () => {
  const today = "2026-10-15T09:30:00";

  it("view・date が正しければそのまま使う", () => {
    expect(parseCalendarParams({ view: "month", date: "2026-02-10" }, today)).toEqual({
      view: "month",
      date: "2026-02-10",
    });
  });

  it("省略時は週表示・今日", () => {
    expect(parseCalendarParams({}, today)).toEqual({ view: "week", date: "2026-10-15" });
  });

  it("不正な view は week にする", () => {
    expect(parseCalendarParams({ view: "day" }, today).view).toBe("week");
  });

  it.each(["2026-02-30", "2026-13-01", "2026/10/15", "20261015", "abc", ""])(
    "不正な date（%s）は今日にする",
    (date) => {
      expect(parseCalendarParams({ date }, today).date).toBe("2026-10-15");
    },
  );

  it("配列で渡された値は不正として扱う", () => {
    expect(parseCalendarParams({ view: ["month", "week"], date: ["2026-02-10"] }, today)).toEqual({
      view: "week",
      date: "2026-10-15",
    });
  });
});

describe("getWeekRange", () => {
  it("水曜日を基準にすると月曜から日曜の 7 日になる", () => {
    const r = getWeekRange("2026-10-14");
    expect(r.days).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(r.from).toBe("2026-10-12T00:00:00");
    expect(r.to).toBe("2026-10-18T23:59:59");
  });

  it("日曜日を基準にしても、その週（月曜始まり）の日曜になる", () => {
    expect(getWeekRange("2026-10-18").days[0]).toBe("2026-10-12");
  });

  it("月曜日を基準にするとその日が先頭になる", () => {
    expect(getWeekRange("2026-10-12").days[0]).toBe("2026-10-12");
  });

  it("月またぎ・年またぎでも正しい", () => {
    const r = getWeekRange("2026-12-31");
    expect(r.days[0]).toBe("2026-12-28");
    expect(r.days[6]).toBe("2027-01-03");
    expect(r.to).toBe("2027-01-03T23:59:59");
  });
});

describe("getMonthGrid", () => {
  it("週ごとの配列になり、各週は月曜から日曜の 7 日", () => {
    const g = getMonthGrid("2026-10-15");
    expect(g.weeks.length).toBeGreaterThanOrEqual(4);
    for (const w of g.weeks) {
      expect(w).toHaveLength(7);
    }
    expect(g.month).toBe("2026-10");
  });

  it("2026 年 10 月は 9/28（月）から 11/1（日）まで", () => {
    const g = getMonthGrid("2026-10-15");
    expect(g.weeks[0][0]).toBe("2026-09-28");
    expect(g.weeks.at(-1)?.[6]).toBe("2026-11-01");
    expect(g.from).toBe("2026-09-28T00:00:00");
    expect(g.to).toBe("2026-11-01T23:59:59");
  });

  it("月初が月曜日の場合、前月の日を含まない（2026 年 6 月）", () => {
    const g = getMonthGrid("2026-06-10");
    expect(g.weeks[0][0]).toBe("2026-06-01");
  });

  it("2 月（うるう年でない）も正しい", () => {
    const g = getMonthGrid("2026-02-10");
    expect(g.weeks[0][0]).toBe("2026-01-26");
    expect(g.weeks.at(-1)?.[6]).toBe("2026-03-01");
  });

  it("12 月は翌年 1 月の日を含む", () => {
    const g = getMonthGrid("2026-12-15");
    expect(g.weeks.at(-1)?.[6]).toBe("2027-01-03");
  });
});

describe("shiftDate", () => {
  it("週表示は 7 日単位で動く", () => {
    expect(shiftDate("2026-10-15", "week", 1)).toBe("2026-10-22");
    expect(shiftDate("2026-10-15", "week", -1)).toBe("2026-10-08");
    expect(shiftDate("2026-12-30", "week", 1)).toBe("2027-01-06");
  });

  it("月表示は 1 か月単位で動く", () => {
    expect(shiftDate("2026-10-15", "month", 1)).toBe("2026-11-15");
    expect(shiftDate("2026-01-10", "month", -1)).toBe("2025-12-10");
    expect(shiftDate("2026-12-10", "month", 1)).toBe("2027-01-10");
  });

  it("移動先に同じ日がない場合は月末に丸める", () => {
    expect(shiftDate("2026-01-31", "month", 1)).toBe("2026-02-28");
    expect(shiftDate("2026-03-31", "month", -1)).toBe("2026-02-28");
  });
});

describe("slotRange", () => {
  it("1 時間枠の開始と終了を壁時計文字列で返す", () => {
    expect(slotRange("2026-10-16", 10)).toEqual({
      start: "2026-10-16T10:00:00",
      end: "2026-10-16T11:00:00",
    });
  });
});

describe("isOccupied", () => {
  const start = "2026-10-16T10:00:00";
  const end = "2026-10-16T11:00:00";

  it("枠と重なる予約があれば true", () => {
    expect(isOccupied([slot("2026-10-16T10:30:00", "2026-10-16T12:00:00")], start, end)).toBe(true);
  });

  it("枠を完全に含む予約も true（複数枠をまたぐ）", () => {
    const s = [slot("2026-10-16T09:00:00", "2026-10-16T13:00:00")];
    expect(isOccupied(s, start, end)).toBe(true);
    expect(isOccupied(s, "2026-10-16T12:00:00", "2026-10-16T13:00:00")).toBe(true);
  });

  it("予約の終了が枠の開始と同じなら重ならない（境界）", () => {
    expect(isOccupied([slot("2026-10-16T09:00:00", "2026-10-16T10:00:00")], start, end)).toBe(
      false,
    );
  });

  it("予約の開始が枠の終了と同じなら重ならない（境界）", () => {
    expect(isOccupied([slot("2026-10-16T11:00:00", "2026-10-16T12:00:00")], start, end)).toBe(
      false,
    );
  });

  it("日をまたぐ予約は翌日の枠も占有する", () => {
    const s = [slot("2026-10-16T22:00:00", "2026-10-17T09:30:00")];
    expect(isOccupied(s, "2026-10-17T08:00:00", "2026-10-17T09:00:00")).toBe(true);
    expect(isOccupied(s, "2026-10-17T10:00:00", "2026-10-17T11:00:00")).toBe(false);
  });

  it("小数秒つきの値でも判定できる", () => {
    const s = [slot("2026-10-16T10:00:00.000000", "2026-10-16T11:00:00.000000")];
    expect(isOccupied(s, "2026-10-16T11:00:00", "2026-10-16T12:00:00")).toBe(false);
    expect(isOccupied(s, start, end)).toBe(true);
  });

  it("予約がなければ false", () => {
    expect(isOccupied([], start, end)).toBe(false);
  });
});

describe("countReservationsOnDay", () => {
  it("その日に重なる予約を reservationId の重複なしで数える", () => {
    const s = [
      slot("2026-10-16T10:00:00", "2026-10-16T11:00:00", "a"),
      slot("2026-10-16T10:00:00", "2026-10-16T11:00:00", "a"),
      slot("2026-10-16T14:00:00", "2026-10-16T15:00:00", "b"),
      slot("2026-10-15T23:00:00", "2026-10-16T01:00:00", "c"),
      slot("2026-10-17T00:00:00", "2026-10-17T01:00:00", "d"),
    ];
    expect(countReservationsOnDay(s, "2026-10-16")).toBe(3);
  });

  it("予約がなければ 0", () => {
    expect(countReservationsOnDay([], "2026-10-16")).toBe(0);
  });
});

describe("getSlotState", () => {
  const start = "2026-10-16T10:00:00";
  const end = "2026-10-16T11:00:00";
  const base = { slots: [], start, end, now: "2026-10-16T09:00:00", isActive: true };

  it("予約なし・未来・有効なら available", () => {
    expect(getSlotState(base)).toBe("available");
  });

  it("予約済みは booked", () => {
    const slots = [slot("2026-10-16T10:00:00", "2026-10-16T11:00:00")];
    expect(getSlotState({ ...base, slots })).toBe("booked");
  });

  it("過去の枠は past", () => {
    expect(getSlotState({ ...base, now: "2026-10-16T10:30:00" })).toBe("past");
  });

  it("現在時刻ちょうどに始まる枠は過去ではない", () => {
    expect(getSlotState({ ...base, now: "2026-10-16T10:00:00" })).toBe("available");
  });

  it("無効なリソースは inactive", () => {
    expect(getSlotState({ ...base, isActive: false })).toBe("inactive");
  });

  it("優先順位は booked > inactive > past > available", () => {
    const slots = [slot("2026-10-16T10:00:00", "2026-10-16T11:00:00")];
    const past = { ...base, now: "2026-10-16T12:00:00" };
    expect(getSlotState({ ...past, slots, isActive: false })).toBe("booked");
    expect(getSlotState({ ...past, isActive: false })).toBe("inactive");
    expect(getSlotState(past)).toBe("past");
  });
});

describe("buildReservationHref", () => {
  it("resourceId・startAt・endAt（1 時間後）を datetime-local 形式で付ける", () => {
    expect(buildReservationHref("res-1", "2026-10-16", 10)).toBe(
      "/reservations/new?resourceId=res-1&startAt=2026-10-16T10%3A00&endAt=2026-10-16T11%3A00",
    );
  });

  it("19 時台の枠は 20:00 終了になる", () => {
    expect(buildReservationHref("res-1", "2026-10-16", 19)).toContain("endAt=2026-10-16T20%3A00");
  });
});
