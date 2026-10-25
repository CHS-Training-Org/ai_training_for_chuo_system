/**
 * 予約一覧ページ（/reservations）の ADMIN 限定表示のテスト
 *
 * screen-spec.md §マイ予約 /reservations: 「CSV ダウンロード」ボタンは ADMIN のときだけ表示し、
 * MEMBER / APPROVER には表示しない。Server Action をモックし、ページの描画結果で確認する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const listReservations = vi.fn();
vi.mock("@/server/actions/reservations", () => ({
  listReservationsAction: (...args: unknown[]) => listReservations(...args),
}));

const getProfile = vi.fn();
vi.mock("@/server/actions/auth", () => ({
  getProfileAction: (...args: unknown[]) => getProfile(...args),
}));

vi.mock("@/server/actions/reports", () => ({
  exportReservationsCsvAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import ReservationsPage from "@/app/(authenticated)/reservations/page";

const emptyPage = {
  content: [],
  totalElements: 0,
  number: 0,
  totalPages: 0,
  first: true,
  last: true,
};

async function renderPage() {
  const ui = await ReservationsPage({ searchParams: Promise.resolve({}) });
  render(ui);
}

describe("ReservationsPage の CSV ダウンロードボタン", () => {
  beforeEach(() => {
    listReservations.mockReset();
    getProfile.mockReset();
    listReservations.mockResolvedValue(emptyPage);
  });

  it("ADMIN には表示される", async () => {
    getProfile.mockResolvedValue({ role: "ADMIN" });

    await renderPage();

    expect(screen.getByRole("heading", { name: "全予約一覧" })).toBeInTheDocument();
    expect(screen.getByTestId("csv-export-open-button")).toBeInTheDocument();
  });

  it.each(["MEMBER", "APPROVER"])("%s には表示されない", async (role) => {
    getProfile.mockResolvedValue({ role });

    await renderPage();

    expect(screen.getByRole("heading", { name: "マイ予約" })).toBeInTheDocument();
    expect(screen.queryByTestId("csv-export-open-button")).not.toBeInTheDocument();
  });

  it("プロフィールの取得に失敗した場合は表示されない", async () => {
    getProfile.mockRejectedValue(new Error("profile unavailable"));

    await renderPage();

    expect(screen.queryByTestId("csv-export-open-button")).not.toBeInTheDocument();
  });
});
