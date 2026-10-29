import { render, screen } from "@testing-library/react";
import ResourceDetailPage from "@/app/(authenticated)/resources/[id]/page";
import { getAvailabilityAction } from "@/server/actions/resources";

vi.mock("@/server/actions/resources", () => ({
  getResourceAction: vi.fn().mockResolvedValue({
    id: "res-1",
    name: "第1会議室",
    category: "ROOM",
    isActive: true,
    requiresApproval: false,
  }),
  getAvailabilityAction: vi.fn().mockResolvedValue([]),
}));

const open = (searchParams: Record<string, string>) =>
  ResourceDetailPage({
    params: Promise.resolve({ id: "res-1" }),
    searchParams: Promise.resolve(searchParams),
  });

describe("リソース詳細ページ: カレンダーの取得期間", () => {
  beforeEach(() => vi.mocked(getAvailabilityAction).mockClear());

  it("週表示は、基準日を含む週（月曜から日曜）の範囲で空き状況を取得する", async () => {
    await open({ view: "week", date: "2026-10-14" });
    expect(getAvailabilityAction).toHaveBeenCalledWith(
      "res-1",
      "2026-10-12T00:00:00",
      "2026-10-18T23:59:59",
    );
  });

  it("月表示は、前後の月の日を含む月グリッドの範囲で空き状況を取得する", async () => {
    await open({ view: "month", date: "2026-10-15" });
    expect(getAvailabilityAction).toHaveBeenCalledWith(
      "res-1",
      "2026-09-28T00:00:00",
      "2026-11-01T23:59:59",
    );
  });
});

describe("リソース詳細ページ: 空き状況の取得に失敗したとき", () => {
  it("リソース情報は表示し、カレンダー領域に取得失敗のメッセージを出す", async () => {
    vi.mocked(getAvailabilityAction).mockRejectedValueOnce(new Error("API error"));

    render(await open({ view: "week", date: "2026-10-14" }));

    expect(screen.getByText("第1会議室")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("空き状況を取得できませんでした");
  });
});
