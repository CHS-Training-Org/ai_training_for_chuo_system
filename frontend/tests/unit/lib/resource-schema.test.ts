/**
 * resource.ts（Zod スキーマ）のユニットテスト
 * equipment / notes の任意・null 許容を検証する。
 */
import { describe, it, expect } from "vitest";
import { CreateResourceSchema } from "@/lib/schemas/resource";

const BASE = {
  name: "第1会議室",
  category: "ROOM" as const,
  requiresApproval: false,
  isActive: true,
};

describe("CreateResourceSchema equipment / notes", () => {
  it("省略しても通り、パース結果にキーが現れない", () => {
    const result = CreateResourceSchema.safeParse(BASE);
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("equipment");
    expect(result.data).not.toHaveProperty("notes");
  });

  it("null を渡すと null のまま保持される", () => {
    const result = CreateResourceSchema.safeParse({ ...BASE, equipment: null, notes: null });
    expect(result.success).toBe(true);
    expect(result.data?.equipment).toBeNull();
    expect(result.data?.notes).toBeNull();
  });

  it("文字列を渡すと値が保持される", () => {
    const result = CreateResourceSchema.safeParse({
      ...BASE,
      equipment: "プロジェクター",
      notes: "利用後は消灯",
    });
    expect(result.success).toBe(true);
    expect(result.data?.equipment).toBe("プロジェクター");
    expect(result.data?.notes).toBe("利用後は消灯");
  });

  it("文字列以外は拒否される", () => {
    expect(CreateResourceSchema.safeParse({ ...BASE, equipment: 123 }).success).toBe(false);
    expect(CreateResourceSchema.safeParse({ ...BASE, notes: true }).success).toBe(false);
  });
});
