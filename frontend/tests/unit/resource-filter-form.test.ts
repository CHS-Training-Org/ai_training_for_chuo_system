/**
 * ResourceFilterForm の buildResourceFilterQuery ユーティリティ単体テスト
 *
 * Client Component 本体のレンダリングテストは Radix Select が絡み jsdom での安定した
 * 検証が難しいため、URL 生成ロジック（buildResourceFilterQuery）を純関数として検証する。
 */
import { describe, it, expect } from "vitest";
import { buildResourceFilterQuery } from "@/app/(authenticated)/resources/ResourceFilterForm";

describe("buildResourceFilterQuery", () => {
  describe("他フィルタとの組み合わせ", () => {
    it("category・from・to を引き継ぐ", () => {
      const query = buildResourceFilterQuery({
        category: "ROOM",
        from: "2026-06-10T09:00",
        to: "2026-06-10T12:00",
      });
      expect(query).toBe("category=ROOM&from=2026-06-10T09%3A00&to=2026-06-10T12%3A00");
    });

    it("category が ALL の場合は付与しない", () => {
      const query = buildResourceFilterQuery({ category: "ALL" });
      expect(query).toBe("");
    });
  });

  describe("keyword（resource-list-filter）", () => {
    it("keyword を指定すると URL に付与する", () => {
      const query = buildResourceFilterQuery({ keyword: "会議室" });
      expect(query).toBe("keyword=%E4%BC%9A%E8%AD%B0%E5%AE%A4");
    });

    it("keyword が空文字の場合は付与しない（条件解除）", () => {
      const query = buildResourceFilterQuery({ keyword: "" });
      expect(query).toBe("");
    });

    it("keyword が空白のみの場合は付与しない", () => {
      const query = buildResourceFilterQuery({ keyword: "   " });
      expect(query).toBe("");
    });

    it("keyword の前後の空白を除去して付与する", () => {
      const query = buildResourceFilterQuery({ keyword: "  会議室  " });
      expect(query).toBe("keyword=%E4%BC%9A%E8%AD%B0%E5%AE%A4");
    });

    it("category・keyword を両方付与する", () => {
      const query = buildResourceFilterQuery({ category: "ROOM", keyword: "会議室" });
      expect(query).toBe("category=ROOM&keyword=%E4%BC%9A%E8%AD%B0%E5%AE%A4");
    });
  });
});
