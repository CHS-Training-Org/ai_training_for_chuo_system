/**
 * ResourceFilterForm の buildResourceFilterQuery ユーティリティ単体テスト
 *
 * Client Component 本体のレンダリングテストは Radix Select が絡み jsdom での安定した
 * 検証が難しいため、URL 生成ロジック（buildResourceFilterQuery）を純関数として検証する。
 * PR レビュー指摘: 「選択値がデフォルトと一致する場合は sort を URL に付与しない」分岐は
 * BFF 層（sort の falsy 判定）とは別条件（デフォルト値との一致判定）のため、専用のテストが必要。
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SORT,
  buildResourceFilterQuery,
} from "@/app/(authenticated)/resources/ResourceFilterForm";

describe("buildResourceFilterQuery", () => {
  describe("sort", () => {
    it("選択値がデフォルト（createdAt,asc）と一致する場合は sort を付与しない", () => {
      const query = buildResourceFilterQuery({ sort: DEFAULT_SORT });
      expect(query).toBe("");
    });

    it("選択値がデフォルトと異なる場合は sort を付与する", () => {
      const query = buildResourceFilterQuery({ sort: "name,asc" });
      expect(query).toBe("sort=name%2Casc");
    });

    it("sort が未指定（空文字）の場合は付与しない", () => {
      const query = buildResourceFilterQuery({ sort: "" });
      expect(query).toBe("");
    });

    it("sort が未指定（undefined）の場合は付与しない", () => {
      const query = buildResourceFilterQuery({});
      expect(query).toBe("");
    });
  });

  describe("keyword", () => {
    it("keyword が指定されている場合は付与する", () => {
      const query = buildResourceFilterQuery({ keyword: "会議室" });
      expect(query).toBe("keyword=%E4%BC%9A%E8%AD%B0%E5%AE%A4");
    });

    it("keyword が未指定（空文字）の場合は付与しない", () => {
      const query = buildResourceFilterQuery({ keyword: "" });
      expect(query).toBe("");
    });

    it("keyword が未指定（undefined）の場合は付与しない", () => {
      const query = buildResourceFilterQuery({});
      expect(query).toBe("");
    });
  });

  describe("他フィルタとの組み合わせ", () => {
    it("category・from・to を引き継ぎつつ、デフォルト sort は付与しない", () => {
      const query = buildResourceFilterQuery({
        category: "ROOM",
        from: "2026-06-10T09:00",
        to: "2026-06-10T12:00",
        sort: DEFAULT_SORT,
      });
      expect(query).toBe("category=ROOM&from=2026-06-10T09%3A00&to=2026-06-10T12%3A00");
    });

    it("category が ALL の場合は付与しない", () => {
      const query = buildResourceFilterQuery({ category: "ALL" });
      expect(query).toBe("");
    });

    it("category・sort（非デフォルト）を両方付与する", () => {
      const query = buildResourceFilterQuery({ category: "EQUIPMENT", sort: "name,desc" });
      expect(query).toBe("category=EQUIPMENT&sort=name%2Cdesc");
    });

    it("keyword・sort（非デフォルト）を両方付与する", () => {
      const query = buildResourceFilterQuery({ keyword: "会議室", sort: "name,desc" });
      expect(query).toBe("keyword=%E4%BC%9A%E8%AD%B0%E5%AE%A4&sort=name%2Cdesc");
    });
  });
});
