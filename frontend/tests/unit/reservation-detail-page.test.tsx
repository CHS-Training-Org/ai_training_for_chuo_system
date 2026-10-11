/**
 * ReservationDetailPage（Server Component）のコンポーネントテスト（React Testing Library）。
 *
 * async 関数コンポーネントのため、直接呼び出して解決済みの JSX を取得し render() に渡す。
 * DRAFT ステータスの予約に対する編集・キャンセルボタンの表示条件（reservation-draft ユニット）を検証する。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReservationDetailPage from "@/app/(authenticated)/reservations/[id]/page";
import type { ReservationResponse, UserResponse } from "@/lib/types/api";

const getReservationActionMock = vi.fn();
const getProfileActionMock = vi.fn();

vi.mock("@/server/actions/reservations", () => ({
  getReservationAction: (...args: unknown[]) => getReservationActionMock(...args),
  cancelReservationAction: vi.fn(),
}));

vi.mock("@/server/actions/auth", () => ({
  getProfileAction: () => getProfileActionMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const OWNER_ID = "20000000-0000-0000-0000-000000000001";

const BASE_RESERVATION: ReservationResponse = {
  id: "20000000-0000-0000-0000-000000000010",
  resourceId: "20000000-0000-0000-0000-000000000020",
  resourceName: "第1会議室",
  requesterId: OWNER_ID,
  requesterName: "田中 花子",
  startAt: "2026-01-15T09:00:00",
  endAt: "2026-01-15T10:00:00",
  purpose: "下書きテスト",
  attendeesCount: null,
  status: "DRAFT",
  createdAt: "2026-01-01T09:00:00",
  updatedAt: "2026-01-01T09:00:00",
};

const OWNER_PROFILE: UserResponse = {
  id: OWNER_ID,
  name: "田中 花子",
  email: "hanako@example.com",
  role: "MEMBER",
  departmentId: "30000000-0000-0000-0000-000000000001",
  departmentName: "テスト部",
  createdAt: "2025-04-01T09:00:00",
};

async function renderPage(reservation: ReservationResponse, profile: UserResponse | null) {
  getReservationActionMock.mockResolvedValue(reservation);
  getProfileActionMock.mockResolvedValue(profile);
  const jsx = await ReservationDetailPage({ params: Promise.resolve({ id: reservation.id }) });
  render(jsx);
}

describe("ReservationDetailPage", () => {
  it("DRAFT の予約を本人が閲覧すると、編集ボタンが表示される", async () => {
    await renderPage(BASE_RESERVATION, OWNER_PROFILE);

    expect(screen.getByRole("link", { name: "予約内容を編集する" })).toBeInTheDocument();
  });

  it("DRAFT の予約を本人が閲覧すると、キャンセルボタンが表示される（下書きの削除に相当）", async () => {
    await renderPage(BASE_RESERVATION, OWNER_PROFILE);

    expect(screen.getByRole("button", { name: "予約をキャンセルする" })).toBeInTheDocument();
  });

  it("DRAFT のステータスバッジが表示される", async () => {
    await renderPage(BASE_RESERVATION, OWNER_PROFILE);

    expect(screen.getByText("ドラフト")).toBeInTheDocument();
  });

  it("ADMIN が DRAFT の予約を閲覧すると、編集ボタンは表示されない（ADMIN は PUT 権限なし）", async () => {
    const admin: UserResponse = { ...OWNER_PROFILE, id: "admin-id", role: "ADMIN" };
    await renderPage(BASE_RESERVATION, admin);

    expect(screen.queryByRole("link", { name: "予約内容を編集する" })).not.toBeInTheDocument();
  });
});
