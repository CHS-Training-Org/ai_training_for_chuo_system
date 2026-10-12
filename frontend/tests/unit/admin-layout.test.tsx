/**
 * AdminLayout（/admin/* の ADMIN ガード）のコンポーネントテスト。
 *
 * 非 ADMIN には 403 画面を表示して子要素（/admin/reports などのページ）を描画しないこと、
 * ADMIN には子要素をそのまま描画することを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLayout from "@/app/(authenticated)/admin/layout";

const getProfileActionMock = vi.fn();

vi.mock("@/server/actions/auth", () => ({
  getProfileAction: () => getProfileActionMock(),
}));

async function renderLayout() {
  const jsx = await AdminLayout({ children: <div data-testid="admin-child">子ページ</div> });
  render(jsx);
}

describe("AdminLayout", () => {
  beforeEach(() => {
    getProfileActionMock.mockReset();
  });

  it("ADMIN には子要素をそのまま表示する", async () => {
    getProfileActionMock.mockResolvedValue({ role: "ADMIN" });

    await renderLayout();

    expect(screen.getByTestId("admin-child")).toBeInTheDocument();
    expect(screen.queryByText("アクセス権限がありません")).not.toBeInTheDocument();
  });

  it.each([["MEMBER"], ["APPROVER"]])(
    "%s には 403 画面を表示し、子要素は表示しない",
    async (role) => {
      getProfileActionMock.mockResolvedValue({ role });

      await renderLayout();

      expect(screen.getByText("403")).toBeInTheDocument();
      expect(screen.getByText("アクセス権限がありません")).toBeInTheDocument();
      expect(screen.queryByTestId("admin-child")).not.toBeInTheDocument();
    },
  );

  it("プロフィールを取得できないときは非 ADMIN として 403 画面を表示する", async () => {
    getProfileActionMock.mockRejectedValue(new Error("profile failed"));

    await renderLayout();

    expect(screen.getByText("アクセス権限がありません")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-child")).not.toBeInTheDocument();
  });
});
