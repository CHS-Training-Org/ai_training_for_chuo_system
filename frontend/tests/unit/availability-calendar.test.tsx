import { render, screen, within } from "@testing-library/react";
import { AvailabilityCalendar } from "@/app/(authenticated)/resources/[id]/availability/AvailabilityCalendar";
import { CalendarToolbar } from "@/app/(authenticated)/resources/[id]/availability/CalendarToolbar";
import { MonthGrid } from "@/app/(authenticated)/resources/[id]/availability/MonthGrid";
import { WeekGrid } from "@/app/(authenticated)/resources/[id]/availability/WeekGrid";
import {
  getMonthGrid,
  getWeekRange,
} from "@/app/(authenticated)/resources/[id]/availability/calendar-utils";

const RID = "res-1";
const NOW = "2026-10-14T12:00:00";

const slot = (startAt: string, endAt: string, reservationId = "r1") => ({
  reservationId,
  startAt,
  endAt,
});

describe("WeekGrid", () => {
  const days = getWeekRange("2026-10-14").days; // 2026-10-12 〜 2026-10-18
  const slots = [slot("2026-10-16T10:00:00", "2026-10-16T12:00:00")];
  const renderGrid = (isActive = true) =>
    render(<WeekGrid resourceId={RID} days={days} slots={slots} now={NOW} isActive={isActive} />);

  it("8 時から 20 時の 12 枠 × 7 日 = 84 枠を表示する", () => {
    const { container } = renderGrid();
    expect(container.querySelectorAll("[data-state]")).toHaveLength(84);
    expect(screen.getByTestId("slot-2026-10-12T08")).toBeInTheDocument();
    expect(screen.getByTestId("slot-2026-10-18T19")).toBeInTheDocument();
    expect(screen.queryByTestId("slot-2026-10-12T07")).not.toBeInTheDocument();
    expect(screen.queryByTestId("slot-2026-10-12T20")).not.toBeInTheDocument();
  });

  it("予約済みの枠はリンクではなく、「予約済み」と表示される", () => {
    renderGrid();
    for (const hour of ["10", "11"]) {
      const cell = screen.getByTestId(`slot-2026-10-16T${hour}`);
      expect(cell).toHaveAttribute("data-state", "booked");
      expect(cell).toHaveAttribute("aria-disabled", "true");
      expect(within(cell).queryByRole("link")).not.toBeInTheDocument();
      expect(cell).toHaveTextContent("予約済み");
    }
    // 予約の終了時刻ちょうどの枠は空き
    expect(screen.getByTestId("slot-2026-10-16T12")).toHaveAttribute("data-state", "available");
  });

  it("過去の枠は押せない", () => {
    renderGrid();
    const cell = screen.getByTestId("slot-2026-10-12T08");
    expect(cell).toHaveAttribute("data-state", "past");
    expect(cell).toHaveAttribute("aria-disabled", "true");
    expect(within(cell).queryByRole("link")).not.toBeInTheDocument();
  });

  it("空き枠は予約申請フォームへのリンクになる", () => {
    renderGrid();
    const cell = screen.getByTestId("slot-2026-10-16T13");
    expect(cell).toHaveAttribute("data-state", "available");
    expect(within(cell).getByRole("link")).toHaveAttribute(
      "href",
      "/reservations/new?resourceId=res-1&startAt=2026-10-16T13%3A00&endAt=2026-10-16T14%3A00",
    );
  });

  it("非アクティブなリソースでは予約フォームへのリンクが 1 つもない", () => {
    const { container } = renderGrid(false);
    expect(container.querySelectorAll('a[href^="/reservations/new"]')).toHaveLength(0);
    expect(screen.getByTestId("slot-2026-10-16T13")).toHaveAttribute("data-state", "inactive");
    // 予約済みの表示は維持される
    expect(screen.getByTestId("slot-2026-10-16T10")).toHaveAttribute("data-state", "booked");
  });
});

describe("CalendarToolbar", () => {
  const renderBar = (view: "week" | "month") =>
    render(
      <CalendarToolbar
        resourceId={RID}
        view={view}
        date="2026-10-14"
        today="2026-10-14"
        label="2026年10月12日 〜 10月18日"
      />,
    );

  it("週表示：前へ・次へは 7 日単位、view を保つ", () => {
    renderBar("week");
    expect(screen.getByRole("link", { name: "前へ" })).toHaveAttribute(
      "href",
      "/resources/res-1?view=week&date=2026-10-07",
    );
    expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute(
      "href",
      "/resources/res-1?view=week&date=2026-10-21",
    );
  });

  it("月表示：前へ・次へは 1 か月単位", () => {
    renderBar("month");
    expect(screen.getByRole("link", { name: "前へ" })).toHaveAttribute(
      "href",
      "/resources/res-1?view=month&date=2026-09-14",
    );
    expect(screen.getByRole("link", { name: "次へ" })).toHaveAttribute(
      "href",
      "/resources/res-1?view=month&date=2026-11-14",
    );
  });

  it("今日・週・月のリンク先", () => {
    renderBar("week");
    expect(screen.getByRole("link", { name: "今日" })).toHaveAttribute(
      "href",
      "/resources/res-1?view=week&date=2026-10-14",
    );
    expect(screen.getByRole("link", { name: "週" })).toHaveAttribute(
      "href",
      "/resources/res-1?view=week&date=2026-10-14",
    );
    expect(screen.getByRole("link", { name: "月" })).toHaveAttribute(
      "href",
      "/resources/res-1?view=month&date=2026-10-14",
    );
  });

  it("表示中の期間の見出しと、現在の表示形式を示す", () => {
    renderBar("week");
    expect(screen.getByText("2026年10月12日 〜 10月18日")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "週" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "月" })).not.toHaveAttribute("aria-current");
  });
});

describe("MonthGrid", () => {
  const { weeks, month } = getMonthGrid("2026-10-14");
  const slots = [
    slot("2026-10-16T10:00:00", "2026-10-16T11:00:00", "a"),
    slot("2026-10-16T10:00:00", "2026-10-16T11:00:00", "a"),
    slot("2026-10-16T14:00:00", "2026-10-16T15:00:00", "b"),
  ];

  it("日ごとの予約件数を表示する（重複なし）", () => {
    render(<MonthGrid resourceId={RID} weeks={weeks} month={month} slots={slots} />);
    expect(screen.getByTestId("day-2026-10-16")).toHaveTextContent("2件");
    expect(screen.getByTestId("day-2026-10-17")).not.toHaveTextContent("件");
  });

  it("日セルをクリックすると、その日を含む週表示へ移動するリンクになる", () => {
    render(<MonthGrid resourceId={RID} weeks={weeks} month={month} slots={slots} />);
    expect(within(screen.getByTestId("day-2026-10-16")).getByRole("link")).toHaveAttribute(
      "href",
      "/resources/res-1?view=week&date=2026-10-16",
    );
  });

  it("グリッドは前後の月の日を含み、表示月以外は区別される", () => {
    render(<MonthGrid resourceId={RID} weeks={weeks} month={month} slots={slots} />);
    expect(screen.getByTestId("day-2026-09-28")).toHaveAttribute("data-outside-month", "true");
    expect(screen.getByTestId("day-2026-10-01")).not.toHaveAttribute("data-outside-month");
  });
});

describe("AvailabilityCalendar", () => {
  const base = {
    resourceId: RID,
    date: "2026-10-14",
    slots: [],
    isActive: true,
    now: NOW,
    error: false,
  };

  it("view=week のとき週グリッドを表示する", () => {
    const { container } = render(<AvailabilityCalendar {...base} view="week" />);
    expect(container.querySelectorAll("[data-state]")).toHaveLength(84);
    expect(screen.queryByTestId("day-2026-10-14")).not.toBeInTheDocument();
  });

  it("view=month のとき月グリッドを表示する", () => {
    const { container } = render(<AvailabilityCalendar {...base} view="month" />);
    expect(screen.getByTestId("day-2026-10-14")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-state]")).toHaveLength(0);
  });

  it("取得失敗時は取得失敗のメッセージを表示し、グリッドは表示しない（ツールバーは残す）", () => {
    const { container } = render(<AvailabilityCalendar {...base} view="week" error />);
    expect(screen.getByRole("alert")).toHaveTextContent("空き状況を取得できませんでした");
    expect(container.querySelectorAll("[data-state]")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "次へ" })).toBeInTheDocument();
  });
});
