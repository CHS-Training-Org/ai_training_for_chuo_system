/**
 * UsageBarChart（利用実績の横棒グラフ）のコンポーネントテスト。
 *
 * 棒の幅が最大値に対する相対値になること、値が数値の文字として併記されること、
 * 最大値が 0 のときに 0 で割らないことを検証する。
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsageBarChart } from "@/app/(authenticated)/admin/reports/UsageBarChart";

const ROWS = [
  { id: "a", label: "第1会議室", value: 4, display: "4 件" },
  { id: "b", label: "第2会議室", value: 2, display: "2 件" },
  { id: "c", label: "備品A", value: 0, display: "0 件" },
];

describe("UsageBarChart", () => {
  it("見出しと、行ごとのリソース名・数値が表示される", () => {
    render(<UsageBarChart title="予約件数" colorClass="bg-chart-1" rows={ROWS} testId="chart" />);

    expect(screen.getByRole("heading", { name: "予約件数" })).toBeInTheDocument();
    expect(screen.getByTestId("chart-row-a")).toHaveTextContent("第1会議室");
    expect(screen.getByTestId("chart-row-a")).toHaveTextContent("4 件");
    expect(screen.getByTestId("chart-row-c")).toHaveTextContent("0 件");
  });

  it("棒の幅は最大値を 100% とした相対値になる", () => {
    render(<UsageBarChart title="予約件数" colorClass="bg-chart-1" rows={ROWS} testId="chart" />);

    expect(screen.getByTestId("chart-bar-a")).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId("chart-bar-b")).toHaveStyle({ width: "50%" });
    expect(screen.getByTestId("chart-bar-c")).toHaveStyle({ width: "0%" });
  });

  it("すべての値が 0 のときは全行 0% になる", () => {
    const zeros = ROWS.map((r) => ({ ...r, value: 0 }));
    render(<UsageBarChart title="予約件数" colorClass="bg-chart-1" rows={zeros} testId="chart" />);

    for (const id of ["a", "b", "c"]) {
      expect(screen.getByTestId(`chart-bar-${id}`)).toHaveStyle({ width: "0%" });
    }
  });

  it("指定した色のクラスが棒に付く", () => {
    render(<UsageBarChart title="予約件数" colorClass="bg-chart-2" rows={ROWS} testId="chart" />);

    expect(screen.getByTestId("chart-bar-a")).toHaveClass("bg-chart-2");
  });

  it("棒は装飾として支援技術から隠される（値は文字で併記される）", () => {
    render(<UsageBarChart title="予約件数" colorClass="bg-chart-1" rows={ROWS} testId="chart" />);

    expect(screen.getByTestId("chart-bar-a").parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
