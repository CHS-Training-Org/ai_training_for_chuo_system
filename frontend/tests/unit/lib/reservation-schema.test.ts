/**
 * reservation.ts（Zod スキーマ）のユニットテスト
 * draft / submit の任意指定と、必須項目の検証が下書きでも変わらないことを検証する。
 */
import { describe, it, expect } from "vitest";
import { CreateReservationSchema, UpdateReservationSchema } from "@/lib/schemas/reservation";

const CREATE_BASE = {
  resourceId: "00000000-0000-4000-8000-000000000001",
  startAt: "2025-07-01T10:00",
  endAt: "2025-07-01T12:00",
  purpose: "会議",
};

describe("CreateReservationSchema draft", () => {
  it("draft を省略しても通り、パース結果にキーが現れない", () => {
    const result = CreateReservationSchema.safeParse(CREATE_BASE);
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("draft");
  });

  it("draft: true を保持する", () => {
    const result = CreateReservationSchema.safeParse({ ...CREATE_BASE, draft: true });
    expect(result.success).toBe(true);
    expect(result.data?.draft).toBe(true);
  });

  it("draft: true でも利用目的が空なら検証エラー（必須項目は通常申請と同一）", () => {
    const result = CreateReservationSchema.safeParse({ ...CREATE_BASE, purpose: "", draft: true });
    expect(result.success).toBe(false);
  });

  it("draft が boolean 以外なら検証エラー", () => {
    expect(CreateReservationSchema.safeParse({ ...CREATE_BASE, draft: "yes" }).success).toBe(false);
  });
});

describe("UpdateReservationSchema submit", () => {
  const UPDATE_BASE = { startAt: "2025-07-01T10:00", endAt: "2025-07-01T12:00", purpose: "会議" };

  it("submit を省略しても通る", () => {
    const result = UpdateReservationSchema.safeParse(UPDATE_BASE);
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("submit");
  });

  it("submit: true を保持する", () => {
    expect(UpdateReservationSchema.parse({ ...UPDATE_BASE, submit: true }).submit).toBe(true);
  });

  it("submit: true でも開始日時が空なら検証エラー", () => {
    expect(
      UpdateReservationSchema.safeParse({ ...UPDATE_BASE, startAt: "", submit: true }).success,
    ).toBe(false);
  });
});
