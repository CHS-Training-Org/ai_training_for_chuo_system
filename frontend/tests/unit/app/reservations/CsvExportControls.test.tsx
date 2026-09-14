import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CsvExportControls } from "@/app/(authenticated)/reservations/CsvExportControls";

describe("CsvExportControls", () => {
  it("両方空の初期状態ではダウンロードリンクが活性であること（全期間扱い）", () => {
    render(<CsvExportControls statuses={[]} />);

    const link = screen.getByTestId("csv-export-download-link");
    expect(link).not.toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("href", "/api/reports/reservations/csv");
  });

  it("片方のみ入力時にリンクがdisabled（aria-disabled）になること", async () => {
    const user = userEvent.setup();
    render(<CsvExportControls statuses={[]} />);

    const fromInput = screen.getByTestId("csv-export-from-input");
    await user.type(fromInput, "2026-09-09T10:00");

    const link = screen.getByTestId("csv-export-download-link");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("href");
  });

  it("両方入力時にdownloadHrefへfrom/to/statusが反映されること", async () => {
    const user = userEvent.setup();
    render(<CsvExportControls statuses={["PENDING", "APPROVED"]} />);

    const fromInput = screen.getByTestId("csv-export-from-input");
    const toInput = screen.getByTestId("csv-export-to-input");
    await user.type(fromInput, "2026-09-09T10:00");
    await user.type(toInput, "2026-09-30T23:59");

    const link = screen.getByTestId("csv-export-download-link");
    const href = link.getAttribute("href");
    expect(href).not.toBeNull();

    const url = new URL(href as string, "http://localhost");
    expect(url.pathname).toBe("/api/reports/reservations/csv");
    expect(url.searchParams.getAll("status")).toEqual(["PENDING", "APPROVED"]);
    expect(url.searchParams.get("from")).toBe("2026-09-09T10:00:00");
    expect(url.searchParams.get("to")).toBe("2026-09-30T23:59:00");
  });

  it("初期値（initialFrom/initialTo）が入力欄に反映されること", () => {
    render(
      <CsvExportControls
        statuses={[]}
        initialFrom="2026-09-01T00:00"
        initialTo="2026-09-30T23:59"
      />,
    );

    expect(screen.getByTestId("csv-export-from-input")).toHaveValue("2026-09-01T00:00");
    expect(screen.getByTestId("csv-export-to-input")).toHaveValue("2026-09-30T23:59");
    expect(screen.getByTestId("csv-export-download-link")).toHaveAttribute(
      "href",
      "/api/reports/reservations/csv?from=2026-09-01T00%3A00%3A00&to=2026-09-30T23%3A59%3A00",
    );
  });
});
