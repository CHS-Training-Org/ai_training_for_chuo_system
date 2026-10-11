/**
 * ReservationEditPage（Server Component、/reservations/{id}/edit）のコンポーネントテスト。
 *
 * ReservationEditForm 単体のテスト（reservation-edit-form.test.tsx）は isDraft を直接 props で
 * 渡しているため、page.tsx が実際に reservation.status から isDraft を算出して伝播する配線と、
 * アクセス制御（PENDING/DRAFT 以外・他人の予約・ADMIN を notFound で弾く）は検証されていなかった
 * （PR #147 CIレビュー指摘）。本ファイルでその配線自体を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ReservationEditPage from "@/app/(authenticated)/reservations/[id]/edit/page";
import type { ReservationResponse, UserResponse } from "@/lib/types/api";

const getReservationActionMock = vi.fn();
const getProfileActionMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/server/actions/reservations", () => ({
  getReservationAction: (...args: unknown[]) => getReservationActionMock(...args),
  updateReservationAction: vi.fn(),
}));

vi.mock("@/server/actions/auth", () => ({
  getProfileAction: () => getProfileActionMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  notFound: () => notFoundMock(),
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
  const jsx = await ReservationEditPage({ params: Promise.resolve({ id: reservation.id }) });
  render(jsx);
}

describe("ReservationEditPage", () => {
  beforeEach(() => {
    notFoundMock.mockClear();
  });

  it("DRAFT の予約を本人が開くと、正式申請ボタン付きで編集フォームが表示される", async () => {
    await renderPage(BASE_RESERVATION, OWNER_PROFILE);

    expect(screen.getByTestId("reservation-edit-form-submit-button")).toBeInTheDocument();
  });

  it("PENDING の予約を本人が開くと、正式申請ボタンは表示されない", async () => {
    await renderPage({ ...BASE_RESERVATION, status: "PENDING" }, OWNER_PROFILE);

    expect(screen.queryByTestId("reservation-edit-form-submit-button")).not.toBeInTheDocument();
  });

  it("APPROVED の予約（DRAFT でも PENDING でもない）を本人が開くと notFound になる", async () => {
    await expect(
      renderPage({ ...BASE_RESERVATION, status: "APPROVED" }, OWNER_PROFILE),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("他人の DRAFT 予約を開くと notFound になる", async () => {
    const other: UserResponse = { ...OWNER_PROFILE, id: "other-member-id" };
    await expect(renderPage(BASE_RESERVATION, other)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("ADMIN が本人の DRAFT 予約であっても notFound になる（ADMIN は PUT 権限なし）", async () => {
    const admin: UserResponse = { ...OWNER_PROFILE, role: "ADMIN" };
    await expect(renderPage(BASE_RESERVATION, admin)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
