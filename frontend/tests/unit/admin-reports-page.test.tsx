/**
 * AdminReportsPage（Server Component、/admin/reports 利用実績）のコンポーネントテスト。
 *
 * 表の行・並び・時間の整形・棒グラフ・空の状態、期間の表示と Server Action への引き渡し、
 * VALIDATION_ERROR のインライン表示とそれ以外のエラーの再 throw を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import AdminReportsPage from "@/app/(authenticated)/admin/reports/page";
import { ApiClientError } from "@/lib/api-client";
import type { ResourceUsageResponse } from "@/lib/types/api";

const getResourceUsageActionMock = vi.fn();

vi.mock("@/server/actions/statistics", () => ({
  getResourceUsageAction: (...args: unknown[]) => getResourceUsageActionMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const ID_A = "20000000-0000-0000-0000-00000000000a";
const ID_B = "20000000-0000-0000-0000-00000000000b";
const ID_C = "20000000-0000-0000-0000-00000000000c";

const USAGE: ResourceUsageResponse[] = [
  { resourceId: ID_A, resourceName: "第1会議室", reservationCount: 4, totalMinutes: 150 },
  { resourceId: ID_B, resourceName: "第2会議室", reservationCount: 2, totalMinutes: 75 },
  { resourceId: ID_C, resourceName: "備品A", reservationCount: 0, totalMinutes: 0 },
];

async function renderPage(searchParams: Record<string, string | string[] | undefined> = {}) {
  const jsx = await AdminReportsPage({ searchParams: Promise.resolve(searchParams) });
  render(jsx);
}

describe("AdminReportsPage", () => {
  beforeEach(() => {
    getResourceUsageActionMock.mockReset();
    getResourceUsageActionMock.mockResolvedValue(USAGE);
  });

  it("見出しと、既定では「全期間」の対象期間が表示される", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "利用実績" })).toBeInTheDocument();
    expect(screen.getByTestId("usage-period-label")).toHaveTextContent("全期間");
  });

  it("期間未指定のとき、Server Action は from・to なしで呼ばれる", async () => {
    await renderPage();

    expect(getResourceUsageActionMock).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it("期間指定のとき、from・to を Server Action に渡し、対象期間に表示する", async () => {
    await renderPage({ from: "2030-10-01T00:00", to: "2030-10-31T23:59" });

    expect(getResourceUsageActionMock).toHaveBeenCalledWith({
      from: "2030-10-01T00:00",
      to: "2030-10-31T23:59",
    });
    expect(screen.getByTestId("usage-period-label")).toHaveTextContent(
      "2030-10-01T00:00 〜 2030-10-31T23:59",
    );
  });

  it("配列で渡された from・to（不正な形）は無視して全期間として扱う", async () => {
    await renderPage({ from: ["a", "b"], to: undefined });

    expect(getResourceUsageActionMock).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it("表に、リソース名・件数・合計利用時間（時間）が API の並びのまま表示される", async () => {
    await renderPage();

    const rows = within(screen.getByTestId("usage-table")).getAllByRole("row");
    // 先頭は見出し行
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent("第1会議室");
    expect(rows[1]).toHaveTextContent("4 件");
    expect(rows[1]).toHaveTextContent("2.5 時間");
    expect(rows[2]).toHaveTextContent("第2会議室");
    expect(rows[2]).toHaveTextContent("1.3 時間");
    expect(rows[3]).toHaveTextContent("備品A");
    expect(rows[3]).toHaveTextContent("0 件");
    expect(rows[3]).toHaveTextContent("0.0 時間");
  });

  it("棒グラフが 2 本（予約件数・合計利用時間）表示され、最大値の行が 100% になる", async () => {
    await renderPage();

    const countChart = screen.getByTestId("usage-chart-count");
    const hoursChart = screen.getByTestId("usage-chart-hours");
    expect(countChart).toHaveTextContent("予約件数");
    expect(hoursChart).toHaveTextContent("合計利用時間（時間）");
    expect(screen.getByTestId(`usage-chart-count-bar-${ID_A}`)).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId(`usage-chart-count-bar-${ID_B}`)).toHaveStyle({ width: "50%" });
    expect(screen.getByTestId(`usage-chart-hours-bar-${ID_A}`)).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId(`usage-chart-hours-bar-${ID_C}`)).toHaveStyle({ width: "0%" });
    expect(within(hoursChart).getByText("2.5 時間")).toBeInTheDocument();
  });

  it("実績が 0 件のリソースしかなくてもグラフと表は表示され、棒は 0% になる", async () => {
    getResourceUsageActionMock.mockResolvedValue([
      { resourceId: ID_A, resourceName: "第1会議室", reservationCount: 0, totalMinutes: 0 },
    ]);

    await renderPage();

    expect(screen.queryByTestId("usage-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("usage-table")).toBeInTheDocument();
    expect(screen.getByTestId(`usage-chart-count-bar-${ID_A}`)).toHaveStyle({ width: "0%" });
  });

  it("表示するリソースが 1 件もないときは空の状態メッセージを表示する", async () => {
    getResourceUsageActionMock.mockResolvedValue([]);

    await renderPage();

    expect(screen.getByTestId("usage-empty")).toHaveTextContent("表示するリソースがありません。");
    expect(screen.queryByTestId("usage-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("usage-chart-count")).not.toBeInTheDocument();
  });

  it("VALIDATION_ERROR のときはメッセージを画面内に表示し、グラフと表は出さない", async () => {
    getResourceUsageActionMock.mockRejectedValue(
      new ApiClientError("VALIDATION_ERROR", "from は to より前にしてください。", 400),
    );

    await renderPage({ from: "2030-10-10T12:00", to: "2030-10-10T10:00" });

    expect(screen.getByTestId("usage-error")).toHaveTextContent(
      "from は to より前にしてください。",
    );
    expect(screen.queryByTestId("usage-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("usage-chart-count")).not.toBeInTheDocument();
    expect(screen.queryByTestId("usage-empty")).not.toBeInTheDocument();
  });

  it("VALIDATION_ERROR 以外の ApiClientError は再 throw する", async () => {
    getResourceUsageActionMock.mockRejectedValue(
      new ApiClientError("FORBIDDEN", "操作権限がありません", 403),
    );

    await expect(AdminReportsPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("想定外のエラーも再 throw する", async () => {
    getResourceUsageActionMock.mockRejectedValue(new Error("boom"));

    await expect(AdminReportsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("boom");
  });

  it("期間フィルタのフォームが表示される", async () => {
    await renderPage({ from: "2030-10-01T00:00", to: "2030-10-31T23:59" });

    expect(screen.getByTestId("usage-filter-from-input")).toHaveValue("2030-10-01T00:00");
    expect(screen.getByTestId("usage-filter-to-input")).toHaveValue("2030-10-31T23:59");
    expect(screen.getByTestId("usage-filter-submit")).toBeInTheDocument();
  });
});
