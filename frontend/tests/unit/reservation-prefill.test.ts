import { parseDateTimeLocalParam } from "@/app/(authenticated)/reservations/new/prefill";

describe("parseDateTimeLocalParam", () => {
  it("YYYY-MM-DDTHH:mm はそのまま返す", () => {
    expect(parseDateTimeLocalParam("2026-10-16T10:00")).toBe("2026-10-16T10:00");
  });

  it.each([
    ["秒つき", "2026-10-16T10:00:00"],
    ["空文字", ""],
    ["日付のみ", "2026-10-16"],
    ["区切りがスペース", "2026-10-16 10:00"],
    ["存在しない日付", "2026-02-30T10:00"],
    ["存在しない時刻", "2026-10-16T25:00"],
    ["分が不正", "2026-10-16T10:60"],
    ["文字列", "abc"],
  ])("%s は無視する", (_label, value) => {
    expect(parseDateTimeLocalParam(value)).toBe("");
  });

  it("undefined と配列は無視する", () => {
    expect(parseDateTimeLocalParam(undefined)).toBe("");
    expect(parseDateTimeLocalParam(["2026-10-16T10:00"] as unknown as string)).toBe("");
  });
});
