/**
 * サイドナビゲーション ロール別表示制御の単体テスト
 * screen-spec.md §共通レイアウト L87–94 準拠
 */
import { describe, it, expect } from "vitest";
import { navItemsForRole } from "@/components/layout/nav-items";
import type { Role } from "@/lib/types";

describe("navItemsForRole", () => {
  // 全ロール共通で表示されるべき href
  const commonHrefs = ["/", "/resources", "/reservations"];
  // APPROVER / ADMIN のみ
  const approverHrefs = ["/approvals"];
  // ADMIN のみ
  const adminHrefs = ["/admin/resources", "/admin/users"];

  it("未認証（null）の場合は空配列を返す", () => {
    expect(navItemsForRole(null)).toEqual([]);
  });

  it("未認証（undefined）の場合は空配列を返す", () => {
    expect(navItemsForRole(undefined)).toEqual([]);
  });

  describe("MEMBER", () => {
    const items = navItemsForRole("MEMBER" as Role);
    const hrefs = items.map((i) => i.href);

    it("共通メニュー（ダッシュボード・リソース一覧・マイ予約）が表示される", () => {
      for (const href of commonHrefs) {
        expect(hrefs).toContain(href);
      }
    });

    it("承認待ち一覧（/approvals）は表示されない", () => {
      for (const href of approverHrefs) {
        expect(hrefs).not.toContain(href);
      }
    });

    it("管理者メニューは表示されない", () => {
      for (const href of adminHrefs) {
        expect(hrefs).not.toContain(href);
      }
    });
  });

  describe("APPROVER", () => {
    const items = navItemsForRole("APPROVER" as Role);
    const hrefs = items.map((i) => i.href);

    it("共通メニューが表示される", () => {
      for (const href of commonHrefs) {
        expect(hrefs).toContain(href);
      }
    });

    it("承認待ち一覧（/approvals）が表示される", () => {
      for (const href of approverHrefs) {
        expect(hrefs).toContain(href);
      }
    });

    it("管理者メニュー（/admin/*）は表示されない", () => {
      for (const href of adminHrefs) {
        expect(hrefs).not.toContain(href);
      }
    });
  });

  describe("ADMIN", () => {
    const items = navItemsForRole("ADMIN" as Role);
    const hrefs = items.map((i) => i.href);

    it("共通メニューが表示される", () => {
      for (const href of commonHrefs) {
        expect(hrefs).toContain(href);
      }
    });

    it("承認待ち一覧（/approvals）が表示される", () => {
      for (const href of approverHrefs) {
        expect(hrefs).toContain(href);
      }
    });

    it("管理者メニュー（/admin/resources・/admin/users）が表示される", () => {
      for (const href of adminHrefs) {
        expect(hrefs).toContain(href);
      }
    });
  });

  it("順序が一定（共通 → APPROVER専用 → ADMIN専用）", () => {
    const adminItems = navItemsForRole("ADMIN" as Role);
    const hrefs = adminItems.map((i) => i.href);
    // 共通項目が先に来る
    expect(hrefs.indexOf("/")).toBeLessThan(hrefs.indexOf("/approvals"));
    expect(hrefs.indexOf("/approvals")).toBeLessThan(hrefs.indexOf("/admin/resources"));
  });
});
