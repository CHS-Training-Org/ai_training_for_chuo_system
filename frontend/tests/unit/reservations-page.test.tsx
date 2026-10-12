/**
 * ReservationsPage（Server Component、/reservations マイ予約一覧）のコンポーネントテスト。
 *
 * 「すべて」タブ（既定表示）が DRAFT を除外して listReservationsAction を呼び出すこと、
 * 「下書き」タブ（?status=DRAFT）がDRAFTのみを要求して呼び出すこと、
 * 下書きタブのリンク自体が描画されることを検証する（PR #147 CIレビュー指摘：
 * page.tsx のこの配線を直接検証するテストが存在しなかった）。
 * 「CSV ダウンロード」ボタンが ADMIN にだけ表示され、現在の絞り込みを引き継ぐことも検証する。
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

async function renderPage(
  searchParams: Record<string, string | string[] | undefined>,
  role: "ADMIN" | "APPROVER" | "MEMBER" | null = null,
) {
  listReservationsActionMock.mockResolvedValue(EMPTY_PAGE);
  getProfileActionMock.mockResolvedValue(role ? { role } : null);
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

  it("繰り返しで作った予約も、一覧にはシリーズ情報（種別・件数・残り回数）を表示しない", async () => {
    const seriesReservation: ReservationResponse = {
      id: "20000000-0000-0000-0000-000000000010",
      resourceId: "20000000-0000-0000-0000-000000000020",
      resourceName: "第1会議室",
      requesterId: "20000000-0000-0000-0000-000000000001",
      requesterName: "田中 花子",
      startAt: "2026-11-09T10:00:00",
      endAt: "2026-11-09T11:00:00",
      purpose: "定例会議",
      attendeesCount: null,
      status: "APPROVED",
      createdAt: "2026-11-01T09:00:00",
      updatedAt: "2026-11-01T09:00:00",
      seriesId: "20000000-0000-0000-0000-000000000090",
      recurrenceType: "WEEKLY",
      recurrenceUntil: "2026-11-23",
      seriesCount: null,
      remainingCount: null,
    };
    listReservationsActionMock.mockResolvedValue({
      ...EMPTY_PAGE,
      content: [seriesReservation],
      totalElements: 1,
      totalPages: 1,
    });
    getProfileActionMock.mockResolvedValue(null);

    render(await ReservationsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("第1会議室")).toBeInTheDocument();
    expect(screen.queryByText("毎週")).not.toBeInTheDocument();
    expect(screen.queryByText(/シリーズ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/残り回数/)).not.toBeInTheDocument();
  });

  describe("CSV ダウンロードボタン", () => {
    it("ADMIN にはボタンが表示される", async () => {
      await renderPage({}, "ADMIN");

      const button = screen.getByTestId("reservations-csv-download");
      expect(button).toHaveTextContent("CSV ダウンロード");
      expect(button).toHaveAttribute("href", "/api/reports/reservations/csv");
    });

    it("ADMIN のボタンは現在の status・from・to を引き継ぎ、resourceName・page は引き継がない", async () => {
      await renderPage(
        {
          status: "APPROVED",
          from: "2030-06-01T00:00",
          to: "2030-06-30T00:00",
          resourceName: "会議",
          page: "2",
        },
        "ADMIN",
      );

      const href = screen.getByTestId("reservations-csv-download").getAttribute("href") ?? "";
      const url = new URL(href, "http://localhost");
      expect(url.pathname).toBe("/api/reports/reservations/csv");
      expect(url.searchParams.getAll("status")).toEqual(["APPROVED"]);
      expect(url.searchParams.get("from")).toBe("2030-06-01T00:00");
      expect(url.searchParams.get("to")).toBe("2030-06-30T00:00");
      expect(url.searchParams.has("resourceName")).toBe(false);
      expect(url.searchParams.has("page")).toBe(false);
    });

    it("「すべて」タブ（status 未指定）では status をクエリに含めない", async () => {
      await renderPage({}, "ADMIN");

      const href = screen.getByTestId("reservations-csv-download").getAttribute("href") ?? "";
      expect(new URL(href, "http://localhost").searchParams.has("status")).toBe(false);
    });

    it.each([["MEMBER" as const], ["APPROVER" as const], [null]])(
      "ロールが %s のときはボタンを表示しない",
      async (role) => {
        await renderPage({}, role);

        expect(screen.queryByTestId("reservations-csv-download")).not.toBeInTheDocument();
      },
    );
  });
});
