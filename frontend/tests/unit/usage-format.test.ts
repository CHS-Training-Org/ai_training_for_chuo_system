/**
 * 利用実績ページの表示用ユーティリティ（usage-format.ts）のユニットテスト
 */
import { describe, it, expect } from "vitest";
import { barPercent, formatHours } from "@/app/(authenticated)/admin/reports/usage-format";

describe("formatHours", () => {
  it.each([
    [150, "2.5"],
    [0, "0.0"],
    [60, "1.0"],
    [59, "1.0"],
    [3, "0.1"],
    [2, "0.0"],
    [1530, "25.5"],
  ])("%i 分は %s 時間と表示する（小数第 1 位に四捨五入）", (minutes, expected) => {
    expect(formatHours(minutes)).toBe(expected);
  });
});

describe("barPercent", () => {
  it("最大値は 100% になる", () => {
    expect(barPercent(4, 4)).toBe(100);
  });

  it("最大値に対する相対値になる", () => {
    expect(barPercent(2, 4)).toBe(50);
  });

  it("値が 0 のときは 0% になる", () => {
    expect(barPercent(0, 4)).toBe(0);
  });

  it("最大値が 0 のときは 0 で割らず 0% を返す", () => {
    expect(barPercent(0, 0)).toBe(0);
  });
});
