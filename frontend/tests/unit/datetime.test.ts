/**
 * lib/datetime.ts のユニットテスト
 */
import { describe, it, expect } from "vitest";
import { toIsoWithSeconds } from "@/lib/datetime";

describe("toIsoWithSeconds", () => {
  it("16 文字（datetime-local）には :00 を補う", () => {
    expect(toIsoWithSeconds("2030-06-10T10:00")).toBe("2030-06-10T10:00:00");
  });

  it("19 文字（秒付き）はそのまま返す", () => {
    expect(toIsoWithSeconds("2030-06-10T10:00:30")).toBe("2030-06-10T10:00:30");
  });

  it("空文字列などそれ以外の長さはそのまま返す", () => {
    expect(toIsoWithSeconds("")).toBe("");
  });
});
