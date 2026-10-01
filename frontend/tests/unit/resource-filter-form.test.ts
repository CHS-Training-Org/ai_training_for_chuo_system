/**
 * ResourceFilterForm の buildResourceFilterParams ユーティリティ単体テスト
 *
 * Client Component 本体のレンダリングテストではなく、URL 生成ロジックを
 * 純関数として検証する（pagination-nav.test.ts と同じ方針）。
 */
import { describe, it, expect } from "vitest";
import { buildResourceFilterParams } from "@/app/(authenticated)/resources/ResourceFilterForm";

function formDataOf(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("buildResourceFilterParams", () => {
  it("keywordを指定すると params に含まれる", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "会議室" }));
    expect(params.get("keyword")).toBe("会議室");
  });

  it("keywordが空文字列の場合は params に含まれない", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "" }));
    expect(params.has("keyword")).toBe(false);
  });

  it("keywordが空白のみの場合は trim されて params に含まれない", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "   " }));
    expect(params.has("keyword")).toBe(false);
  });

  it("keywordの前後の空白は trim される", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "  会議室  " }));
    expect(params.get("keyword")).toBe("会議室");
  });

  it("category=ALL は params から除外される", () => {
    const params = buildResourceFilterParams(formDataOf({ category: "ALL" }));
    expect(params.has("category")).toBe(false);
  });

  it("category・from・to・keyword を同時に指定できる（AND条件）", () => {
    const params = buildResourceFilterParams(
      formDataOf({
        category: "ROOM",
        from: "2025-06-01T09:00",
        to: "2025-06-01T18:00",
        keyword: "プロジェクター",
      }),
    );
    expect(params.get("category")).toBe("ROOM");
    expect(params.get("from")).toBe("2025-06-01T09:00");
    expect(params.get("to")).toBe("2025-06-01T18:00");
    expect(params.get("keyword")).toBe("プロジェクター");
  });

  it("すべて空の場合は空の params を返す", () => {
    const params = buildResourceFilterParams(formDataOf({}));
    expect(params.toString()).toBe("");
  });
});
