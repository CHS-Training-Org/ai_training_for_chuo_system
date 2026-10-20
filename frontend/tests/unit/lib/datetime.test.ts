/**
 * lib/datetime.ts のユニットテスト
 */
import { describe, it, expect } from "vitest";
import { toIsoWithSeconds } from "@/lib/datetime";

describe("toIsoWithSeconds", () => {
  it("datetime-local の 16 桁には秒（:00）を補う", () => {
    expect(toIsoWithSeconds("2025-06-10T10:00")).toBe("2025-06-10T10:00:00");
  });

  it("秒付きの 19 桁はそのまま返す", () => {
    expect(toIsoWithSeconds("2025-06-10T10:00:30")).toBe("2025-06-10T10:00:30");
  });

  it("空文字列はそのまま返す", () => {
    expect(toIsoWithSeconds("")).toBe("");
  });
});
