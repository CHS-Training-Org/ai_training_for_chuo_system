/**
 * 予約詳細画面（reservations/[id]/page.tsx）の操作ボタン表示分岐テスト。
 * DRAFT: 本人のみ 編集・正式申請・削除（キャンセルなし）／PENDING: 従来どおり／ADMIN: 閲覧のみ。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MOCK_RESERVATION_RESPONSE } from "../msw/handlers";

const getReservationAction = vi.fn();
const getProfileAction = vi.fn();
vi.mock("@/server/actions/reservations", () => ({
  getReservationAction: (...args: unknown[]) => getReservationAction(...args),
  submitReservationAction: vi.fn(),
  deleteReservationAction: vi.fn(),
  cancelReservationAction: vi.fn(),
}));
vi.mock("@/server/actions/auth", () => ({
  getProfileAction: (...args: unknown[]) => getProfileAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { default: ReservationDetailPage } =
  await import("@/app/(authenticated)/reservations/[id]/page");

const OWNER_ID = MOCK_RESERVATION_RESPONSE.requesterId;

async function renderPage(status: string, profile: { id: string; role: string }) {
  getReservationAction.mockResolvedValue({ ...MOCK_RESERVATION_RESPONSE, status });
  getProfileAction.mockResolvedValue(profile);
  const ui = await ReservationDetailPage({
    params: Promise.resolve({ id: MOCK_RESERVATION_RESPONSE.id }),
  });
  render(ui);
}

describe("ReservationDetailPage 下書きの操作", () => {
  beforeEach(() => {
    getReservationAction.mockReset();
    getProfileAction.mockReset();
  });

  it("DRAFT × 本人: 編集・正式申請・削除を表示し、キャンセルは表示しない", async () => {
    await renderPage("DRAFT", { id: OWNER_ID, role: "MEMBER" });

    expect(screen.getByRole("link", { name: "予約内容を編集する" })).toBeInTheDocument();
    expect(screen.getByTestId("reservation-detail-submit-button")).toBeInTheDocument();
    expect(screen.getByTestId("reservation-detail-delete-button")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "予約をキャンセルする" })).not.toBeInTheDocument();
    expect(screen.getByText("下書き")).toBeInTheDocument();
  });

  it("PENDING × 本人: 従来どおり編集とキャンセルを表示し、正式申請・削除は表示しない", async () => {
    await renderPage("PENDING", { id: OWNER_ID, role: "MEMBER" });

    expect(screen.getByRole("link", { name: "予約内容を編集する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "予約をキャンセルする" })).toBeInTheDocument();
    expect(screen.queryByTestId("reservation-detail-submit-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reservation-detail-delete-button")).not.toBeInTheDocument();
  });

  it("DRAFT × ADMIN（他人の下書き）: 閲覧のみで操作ボタンを表示しない", async () => {
    await renderPage("DRAFT", { id: "00000000-0000-0000-0000-0000000000ff", role: "ADMIN" });

    expect(screen.queryByRole("link", { name: "予約内容を編集する" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("reservation-detail-submit-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reservation-detail-delete-button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "予約をキャンセルする" })).not.toBeInTheDocument();
  });

  it("APPROVED × 本人: キャンセルのみ表示する", async () => {
    await renderPage("APPROVED", { id: OWNER_ID, role: "MEMBER" });

    expect(screen.getByRole("button", { name: "予約をキャンセルする" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "予約内容を編集する" })).not.toBeInTheDocument();
  });
});
