/**
 * マイ予約一覧（reservations/page.tsx）のステータスフィルタタブのテスト。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MOCK_RESERVATION_LIST_RESPONSE } from "../msw/handlers";

const listReservationsAction = vi.fn();
const getProfileAction = vi.fn();
vi.mock("@/server/actions/reservations", () => ({
  listReservationsAction: (...args: unknown[]) => listReservationsAction(...args),
}));
vi.mock("@/server/actions/auth", () => ({
  getProfileAction: (...args: unknown[]) => getProfileAction(...args),
}));

const { default: ReservationsPage } = await import("@/app/(authenticated)/reservations/page");

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  const ui = await ReservationsPage({ searchParams: Promise.resolve(searchParams) });
  render(ui);
}

describe("ReservationsPage ステータスタブ", () => {
  beforeEach(() => {
    listReservationsAction.mockReset().mockResolvedValue(MOCK_RESERVATION_LIST_RESPONSE);
    getProfileAction.mockReset().mockResolvedValue({ id: "u1", role: "MEMBER" });
  });

  it("「下書き」タブが ?status=DRAFT へのリンクとして表示される", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "下書き" })).toHaveAttribute(
      "href",
      "/reservations?status=DRAFT",
    );
  });

  it("?status=DRAFT のとき DRAFT で一覧を取得する", async () => {
    await renderPage({ status: "DRAFT" });

    expect(listReservationsAction).toHaveBeenCalledWith({ status: ["DRAFT"], page: 0 });
  });
});
