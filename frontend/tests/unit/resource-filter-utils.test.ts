import { describe, expect, it } from "vitest";
import { setKeywordParam } from "@/app/(authenticated)/resources/resource-filter-utils";

describe("setKeywordParam", () => {
  it("前後の空白を除いて keyword に設定する", () => {
    const params = new URLSearchParams();

    setKeywordParam(params, "  projector  ");

    expect(params.get("keyword")).toBe("projector");
  });

  it.each(["", "   "])("値が空または空白のみなら keyword を設定しない", (value) => {
    const params = new URLSearchParams();

    setKeywordParam(params, value);

    expect(params.has("keyword")).toBe(false);
  });

  it("値が null なら keyword を設定しない", () => {
    const params = new URLSearchParams();

    setKeywordParam(params, null);

    expect(params.has("keyword")).toBe(false);
  });
});
