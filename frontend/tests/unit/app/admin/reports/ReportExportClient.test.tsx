/**
 * ReportExportClient のエラーハンドリング（handleDownload 失敗時）ユニットテスト
 *
 * `/api/reports/reservations/csv` への fetch を MSW でスタブし、レスポンスステータスごとに
 * 表示される toast メッセージが権限エラー・セッション切れ・その他のエラーで正しく分岐することを確認する。
 * 成功系（ダウンロード発火）は `triggerBrowserDownload` が `URL.createObjectURL` に依存し jsdom で
 * 副作用の検証コストが高いため対象外とする。
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw/server";
import { ReportExportClient } from "@/app/(authenticated)/admin/reports/ReportExportClient";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const { toast } = await import("sonner");

const CSV_EXPORT_URL = "/api/reports/reservations/csv";

async function clickDownload() {
  render(<ReportExportClient />);
  await userEvent.click(screen.getByTestId("report-download-button"));
}

describe("ReportExportClient handleDownload エラーハンドリング", () => {
  it("権限エラー（403）: 管理者専用メッセージを表示する", async () => {
    server.use(
      http.get(CSV_EXPORT_URL, () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "forbidden" }, { status: 403 }),
      ),
    );

    await clickDownload();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("この操作は管理者のみ実行できます。");
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("セッション切れ（401）: 再ログインを促すメッセージを表示する", async () => {
    server.use(
      http.get(CSV_EXPORT_URL, () =>
        HttpResponse.json({ code: "UNAUTHORIZED", message: "unauthorized" }, { status: 401 }),
      ),
    );

    await clickDownload();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "セッションの有効期限が切れました。再度ログインしてください。",
      );
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("その他のエラー（500）: 汎用の失敗メッセージを表示する", async () => {
    server.use(
      http.get(CSV_EXPORT_URL, () =>
        HttpResponse.json({ code: "INTERNAL_ERROR", message: "internal error" }, { status: 500 }),
      ),
    );

    await clickDownload();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "CSV のダウンロードに失敗しました。時間をおいて再度お試しください。",
      );
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
