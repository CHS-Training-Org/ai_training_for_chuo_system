/**
 * ResourceFilterForm の buildResourceFilterParams ユーティリティ単体テスト
 *
 * コンポーネント本体のレンダリングテストは行わず、pagination-nav.test.ts と同じ方針で
 * URL 組み立てロジック（buildResourceFilterParams）を FormData を直接渡して検証する。
 */
import { describe, it, expect } from "vitest";
import { buildResourceFilterParams } from "@/app/(authenticated)/resources/ResourceFilterForm";

function formDataOf(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

describe("buildResourceFilterParams", () => {
  it("キーワードのみ指定した場合、keyword パラメータが付与される", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "projector" }));
    expect(params.toString()).toBe("keyword=projector");
  });

  it("キーワードが空文字の場合、keyword パラメータは付与されない", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "" }));
    expect(params.toString()).toBe("");
  });

  it("キーワードが空白のみの場合、トリムされて keyword パラメータは付与されない", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "   " }));
    expect(params.toString()).toBe("");
  });

  it("キーワードの前後の空白はトリムされる", () => {
    const params = buildResourceFilterParams(formDataOf({ keyword: "  room  " }));
    expect(params.get("keyword")).toBe("room");
  });

  it("カテゴリが ALL の場合、category パラメータは付与されない", () => {
    const params = buildResourceFilterParams(formDataOf({ category: "ALL" }));
    expect(params.toString()).toBe("");
  });

  it("カテゴリ・キーワード・期間を同時指定すると、すべて AND 条件でパラメータに含まれる", () => {
    const params = buildResourceFilterParams(
      formDataOf({
        category: "ROOM",
        keyword: "projector",
        from: "2026-06-10T09:00",
        to: "2026-06-10T12:00",
      }),
    );

    expect(params.get("category")).toBe("ROOM");
    expect(params.get("keyword")).toBe("projector");
    expect(params.get("from")).toBe("2026-06-10T09:00");
    expect(params.get("to")).toBe("2026-06-10T12:00");
  });

  it("何も指定しない場合、空のパラメータを返す", () => {
    const params = buildResourceFilterParams(formDataOf({}));
    expect(params.toString()).toBe("");
  });
});
