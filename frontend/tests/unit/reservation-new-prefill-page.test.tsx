import { render, screen } from "@testing-library/react";
import ReservationNewPage from "@/app/(authenticated)/reservations/new/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/server/actions/resources", () => ({
  listResourcesAction: vi.fn().mockResolvedValue({ content: [] }),
}));
vi.mock("@/server/actions/reservations", () => ({ createReservationAction: vi.fn() }));

const renderPage = async (searchParams: Record<string, string>) =>
  render(await ReservationNewPage({ searchParams: Promise.resolve(searchParams) }));

describe("予約申請ページ: startAt / endAt の初期値", () => {
  it("カレンダーから渡された startAt / endAt が入力欄の初期値になる", async () => {
    await renderPage({ startAt: "2026-10-16T10:00", endAt: "2026-10-16T11:00" });
    expect(screen.getByLabelText("開始日時 *")).toHaveValue("2026-10-16T10:00");
    expect(screen.getByLabelText("終了日時 *")).toHaveValue("2026-10-16T11:00");
  });

  it("不正な値は無視され、入力欄は空のまま", async () => {
    await renderPage({ startAt: "abc", endAt: "2026-02-30T10:00" });
    expect(screen.getByLabelText("開始日時 *")).toHaveValue("");
    expect(screen.getByLabelText("終了日時 *")).toHaveValue("");
  });
});
