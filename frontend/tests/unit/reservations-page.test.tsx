/**
 * ReservationsPage（Server Component、/reservations マイ予約一覧）のコンポーネントテスト。
 *
 * 「すべて」タブ（既定表示）が DRAFT を除外して listReservationsAction を呼び出すこと、
 * 「下書き」タブ（?status=DRAFT）がDRAFTのみを要求して呼び出すこと、
 * 下書きタブのリンク自体が描画されることを検証する（PR #147 CIレビュー指摘：
 * page.tsx のこの配線を直接検証するテストが存在しなかった）。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ReservationsPage from "@/app/(authenticated)/reservations/page";
import type { Paginated, ReservationResponse } from "@/lib/types/api";

const listReservationsActionMock = vi.fn();
const getProfileActionMock = vi.fn();

vi.mock("@/server/actions/reservations", () => ({
  listReservationsAction: (...args: unknown[]) => listReservationsActionMock(...args),
}));

vi.mock("@/server/actions/auth", () => ({
  getProfileAction: () => getProfileActionMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const EMPTY_PAGE: Paginated<ReservationResponse> = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 20,
  first: true,
  last: true,
};

async function renderPage(searchParams: Record<string, string | string[] | undefined>) {
  listReservationsActionMock.mockResolvedValue(EMPTY_PAGE);
  getProfileActionMock.mockResolvedValue(null);
  const jsx = await ReservationsPage({ searchParams: Promise.resolve(searchParams) });
  render(jsx);
}

describe("ReservationsPage", () => {
  beforeEach(() => {
    listReservationsActionMock.mockClear();
    getProfileActionMock.mockClear();
  });

  it("「すべて」タブ（status未指定）では DRAFT を含まない4ステータスで絞り込む", async () => {
    await renderPage({});

    expect(listReservationsActionMock).toHaveBeenCalledTimes(1);
    const callArgs = listReservationsActionMock.mock.calls[0][0];
    expect(callArgs.status).toEqual(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);
  });

  it("「下書き」タブ（?status=DRAFT）では DRAFT のみで絞り込む", async () => {
    await renderPage({ status: "DRAFT" });

    expect(listReservationsActionMock).toHaveBeenCalledTimes(1);
    const callArgs = listReservationsActionMock.mock.calls[0][0];
    expect(callArgs.status).toEqual(["DRAFT"]);
  });

  it("「下書き」タブへのリンクが表示される", async () => {
    await renderPage({});

    const draftTab = screen.getByTestId("reservations-draft-tab");
    expect(draftTab).toHaveTextContent("下書き");
    expect(draftTab).toHaveAttribute("href", "/reservations?status=DRAFT");
  });
});
