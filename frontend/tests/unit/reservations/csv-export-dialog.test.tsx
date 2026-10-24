/**
 * CsvExportDialog のユニットテスト
 *
 * Server Action と sonner をモックし、入力値の受け渡し・Blob ダウンロード・失敗時のトーストを検証する。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const exportAction = vi.fn();
vi.mock("@/server/actions/reports", () => ({
  exportReservationsCsvAction: (...args: unknown[]) => exportAction(...args),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

import { CsvExportDialog } from "@/app/(authenticated)/reservations/CsvExportDialog";

const createObjectURL = vi.fn(() => "blob:mock");
const revokeObjectURL = vi.fn();
let clicks: { download: string; href: string }[] = [];

describe("CsvExportDialog", () => {
  beforeEach(() => {
    exportAction.mockReset();
    toastError.mockClear();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    // jsdom は <a> のクリックによるナビゲーションを実装していないため、クリックを記録するだけにする
    clicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function (this: HTMLAnchorElement) {
        clicks.push({ download: this.download, href: this.href });
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function openDialog() {
    const user = userEvent.setup();
    render(<CsvExportDialog />);
    await user.click(screen.getByTestId("csv-export-open-button"));
    return user;
  }

  it("「CSV ダウンロード」ボタンでダイアログが開き、入力項目と文言が表示される", async () => {
    await openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CSV ダウンロード" })).toBeInTheDocument();
    expect(screen.getByLabelText("開始日時")).toHaveAttribute("type", "datetime-local");
    expect(screen.getByLabelText("終了日時")).toHaveAttribute("type", "datetime-local");
    expect(screen.getByText("ステータス")).toBeInTheDocument();
    for (const label of ["承認待ち", "承認済み", "却下", "キャンセル済み"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("type", "checkbox");
    }
    expect(screen.getByRole("button", { name: "ダウンロード" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
  });

  it("何も入力せずダウンロードすると、条件なしで Action を呼ぶ", async () => {
    exportAction.mockResolvedValue({ filename: "reservations_20261024.csv", content: "﻿x" });
    const user = await openDialog();

    await user.click(screen.getByTestId("csv-export-submit-button"));

    await waitFor(() => expect(exportAction).toHaveBeenCalledTimes(1));
    expect(exportAction).toHaveBeenCalledWith({});
  });

  it("入力した期間とステータスを Action に渡す", async () => {
    exportAction.mockResolvedValue({ filename: "reservations_20261024.csv", content: "﻿x" });
    const user = await openDialog();

    await user.type(screen.getByLabelText("開始日時"), "2026-06-01T00:00");
    await user.type(screen.getByLabelText("終了日時"), "2026-07-01T00:00");
    await user.click(screen.getByLabelText("承認待ち"));
    await user.click(screen.getByLabelText("承認済み"));
    await user.click(screen.getByTestId("csv-export-submit-button"));

    await waitFor(() => expect(exportAction).toHaveBeenCalledTimes(1));
    expect(exportAction).toHaveBeenCalledWith({
      from: "2026-06-01T00:00",
      to: "2026-07-01T00:00",
      status: ["PENDING", "APPROVED"],
    });
  });

  it("チェックを外したステータスは渡さない", async () => {
    exportAction.mockResolvedValue({ filename: "reservations_20261024.csv", content: "﻿x" });
    const user = await openDialog();

    await user.click(screen.getByLabelText("却下"));
    await user.click(screen.getByLabelText("却下"));
    await user.click(screen.getByTestId("csv-export-submit-button"));

    await waitFor(() => expect(exportAction).toHaveBeenCalledTimes(1));
    expect(exportAction).toHaveBeenCalledWith({});
  });

  it("成功すると BOM 付きの Blob を作り、ファイル名つきでダウンロードしてダイアログを閉じる", async () => {
    exportAction.mockResolvedValue({
      filename: "reservations_20261024.csv",
      content: "﻿予約ID\r\n",
    });
    const user = await openDialog();

    await user.click(screen.getByTestId("csv-export-submit-button"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toBe("text/csv;charset=utf-8");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(clicks).toEqual([{ download: "reservations_20261024.csv", href: "blob:mock" }]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("失敗するとトーストを表示し、ダイアログは開いたまま・ダウンロードしない", async () => {
    exportAction.mockRejectedValue(new Error("boom"));
    const user = await openDialog();

    await user.click(screen.getByTestId("csv-export-submit-button"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("CSV のダウンロードに失敗しました。"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("「キャンセル」でダウンロードせずに閉じる", async () => {
    const user = await openDialog();

    await user.click(screen.getByTestId("csv-export-cancel-button"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(exportAction).not.toHaveBeenCalled();
  });
});
