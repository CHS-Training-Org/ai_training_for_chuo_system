/**
 * 予約編集画面（reservations/[id]/edit/page.tsx）のアクセス制御分岐テスト。
 * DRAFT / PENDING は本人のみ編集可、それ以外のステータス・ADMIN・他人は notFound。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MOCK_RESERVATION_RESPONSE } from "../msw/handlers";

const getReservationAction = vi.fn();
const getProfileAction = vi.fn();
vi.mock("@/server/actions/reservations", () => ({
  getReservationAction: (...args: unknown[]) => getReservationAction(...args),
  updateReservationAction: vi.fn(),
}));
vi.mock("@/server/actions/auth", () => ({
  getProfileAction: (...args: unknown[]) => getProfileAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: ReservationEditPage } =
  await import("@/app/(authenticated)/reservations/[id]/edit/page");

const OWNER_ID = MOCK_RESERVATION_RESPONSE.requesterId;

async function renderPage(status: string, profile: { id: string; role: string }) {
  getReservationAction.mockResolvedValue({ ...MOCK_RESERVATION_RESPONSE, status });
  getProfileAction.mockResolvedValue(profile);
  const ui = await ReservationEditPage({
    params: Promise.resolve({ id: MOCK_RESERVATION_RESPONSE.id }),
  });
  render(ui);
}

describe("ReservationEditPage 編集可否", () => {
  beforeEach(() => {
    getReservationAction.mockReset();
    getProfileAction.mockReset();
  });

  it("DRAFT × 本人: 編集フォームと下書き向け説明を表示する", async () => {
    await renderPage("DRAFT", { id: OWNER_ID, role: "MEMBER" });

    expect(screen.getByRole("heading", { name: "予約内容を編集する" })).toBeInTheDocument();
    expect(
      screen.getByText(/下書き（DRAFT）の日時・目的・参加人数を変更できます/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/利用目的/)).toBeInTheDocument();
  });

  it("PENDING × 本人: 編集フォームを表示する", async () => {
    await renderPage("PENDING", { id: OWNER_ID, role: "MEMBER" });

    expect(screen.getByText(/承認待ち（PENDING）の予約/)).toBeInTheDocument();
  });

  it.each(["APPROVED", "REJECTED", "CANCELLED"])("%s × 本人: notFound にする", async (status) => {
    await expect(renderPage(status, { id: OWNER_ID, role: "MEMBER" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("DRAFT × 他人: notFound にする", async () => {
    await expect(
      renderPage("DRAFT", { id: "00000000-0000-0000-0000-0000000000ff", role: "MEMBER" }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
