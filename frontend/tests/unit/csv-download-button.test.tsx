/**
 * CsvDownloadButton（予約一覧の CSV ダウンロードリンク）のコンポーネントテスト。
 *
 * 現在の絞り込み（status・from・to）がクエリに引き継がれ、値のない項目は付かないことを検証する。
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CsvDownloadButton } from "@/app/(authenticated)/reservations/CsvDownloadButton";

function renderButton(props: { status: string[]; from?: string; to?: string }) {
  render(<CsvDownloadButton {...props} />);
  const link = screen.getByTestId("reservations-csv-download");
  const href = link.getAttribute("href") ?? "";
  const url = new URL(href, "http://localhost");
  return { link, url };
}

describe("CsvDownloadButton", () => {
  it("ラベル「CSV ダウンロード」の download リンクを描画する", () => {
    const { link } = renderButton({ status: [] });

    expect(link).toHaveTextContent("CSV ダウンロード");
    expect(link).toHaveAttribute("download");
  });

  it("値がないときはクエリを付けない", () => {
    const { link } = renderButton({ status: [] });

    expect(link).toHaveAttribute("href", "/api/reports/reservations/csv");
  });

  it("選択中の status を項目ごとに繰り返して引き継ぐ", () => {
    const { url } = renderButton({ status: ["PENDING", "APPROVED"] });

    expect(url.pathname).toBe("/api/reports/reservations/csv");
    expect(url.searchParams.getAll("status")).toEqual(["PENDING", "APPROVED"]);
    expect(url.searchParams.has("from")).toBe(false);
    expect(url.searchParams.has("to")).toBe(false);
  });

  it("期間（from・to）を引き継ぐ", () => {
    const { url } = renderButton({
      status: ["DRAFT"],
      from: "2030-06-01T00:00",
      to: "2030-06-30T23:59",
    });

    expect(url.searchParams.getAll("status")).toEqual(["DRAFT"]);
    expect(url.searchParams.get("from")).toBe("2030-06-01T00:00");
    expect(url.searchParams.get("to")).toBe("2030-06-30T23:59");
  });

  it("resourceName と page のクエリは付けない", () => {
    const { url } = renderButton({ status: ["APPROVED"], from: "2030-06-01T00:00" });

    expect(url.searchParams.has("resourceName")).toBe(false);
    expect(url.searchParams.has("page")).toBe(false);
  });
});
