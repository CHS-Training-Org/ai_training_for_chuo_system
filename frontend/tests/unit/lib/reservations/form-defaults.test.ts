/**
 * ReservationForm の初期値組み立てユーティリティ単体テスト
 *
 * フォーム本体のレンダリングテストではなく、クエリパラメータ（resourceId・startAt）が
 * フォーム初期値にどう反映されるかを純関数として検証する。
 */
import { describe, it, expect } from "vitest";
import { buildDefaultFormValues } from "@/lib/reservations/form-defaults";

describe("buildDefaultFormValues", () => {
  it("resourceId・startAt が指定された場合、それぞれ初期値に反映する", () => {
    const values = buildDefaultFormValues("res-1", "2026-10-01T13:00");
    expect(values.resourceId).toBe("res-1");
    expect(values.startAt).toBe("2026-10-01T13:00");
  });

  it("resourceId が未指定の場合は空文字にする", () => {
    const values = buildDefaultFormValues(undefined, "2026-10-01T13:00");
    expect(values.resourceId).toBe("");
  });

  it("startAt が未指定の場合は空文字にする（通常のリソース一覧からの遷移）", () => {
    const values = buildDefaultFormValues("res-1", undefined);
    expect(values.startAt).toBe("");
  });

  it("endAt・purpose は常に空文字、attendeesCount は常に null にする", () => {
    const values = buildDefaultFormValues("res-1", "2026-10-01T13:00");
    expect(values.endAt).toBe("");
    expect(values.purpose).toBe("");
    expect(values.attendeesCount).toBeNull();
  });
});
