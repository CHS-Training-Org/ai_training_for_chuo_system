/**
 * ResourceFilterForm の buildResourceFilterHref ユーティリティ単体テスト
 *
 * クライアントコンポーネント本体のレンダリングテストは行わず、
 * URL 生成ロジック（buildResourceFilterHref）を純関数として検証する
 * （pagination-nav.test.ts と同じ方針）。
 */
import { describe, it, expect } from "vitest";
import { buildResourceFilterHref } from "@/app/(authenticated)/resources/ResourceFilterForm";

describe("buildResourceFilterHref", () => {
  describe("キーワード", () => {
    it("キーワードを指定すると ?keyword=... を付与する", () => {
      expect(buildResourceFilterHref({ keyword: "会議" })).toBe(
        "/resources?keyword=%E4%BC%9A%E8%AD%B0",
      );
    });

    it("キーワードが空文字の場合は keyword を付与しない（条件の解除）", () => {
      expect(buildResourceFilterHref({ keyword: "", category: "ROOM" })).toBe(
        "/resources?category=ROOM",
      );
    });

    it("キーワードが undefined の場合は keyword を付与しない", () => {
      expect(buildResourceFilterHref({ category: "ROOM" })).toBe("/resources?category=ROOM");
    });
  });

  describe("他の条件との組み合わせ", () => {
    it("キーワード・カテゴリ・期間を同時に指定すると 3 つとも付与する", () => {
      const href = buildResourceFilterHref({
        keyword: "projector",
        category: "ROOM",
        from: "2025-06-01T09:00",
        to: "2025-06-01T18:00",
      });

      expect(href).toContain("keyword=projector");
      expect(href).toContain("category=ROOM");
      expect(href).toContain("from=2025-06-01T09%3A00");
      expect(href).toContain("to=2025-06-01T18%3A00");
    });

    it("カテゴリが ALL の場合は category を付与しない", () => {
      expect(buildResourceFilterHref({ keyword: "会議室", category: "ALL" })).toBe(
        "/resources?keyword=%E4%BC%9A%E8%AD%B0%E5%AE%A4",
      );
    });
  });

  describe("条件なし", () => {
    it("すべて空の場合はクエリなしの /resources を返す", () => {
      expect(buildResourceFilterHref({})).toBe("/resources");
    });

    it("すべて空文字の場合もクエリなしの /resources を返す", () => {
      expect(buildResourceFilterHref({ keyword: "", category: "", from: "", to: "" })).toBe(
        "/resources",
      );
    });
  });
});
