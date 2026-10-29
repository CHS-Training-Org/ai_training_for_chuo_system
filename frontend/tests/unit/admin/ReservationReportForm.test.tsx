/**
 * ReservationReportForm のコンポーネントテスト
 * fetch は MSW でスタブし、sonner のトーストと Blob 保存はモックする。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

const saveBlob = vi.fn();
vi.mock("@/lib/download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/download")>()),
  saveBlob: (...args: unknown[]) => saveBlob(...args),
}));

const { ReservationReportForm } =
  await import("@/app/(authenticated)/admin/reservations/ReservationReportForm");

function csvHandler(onRequest?: (params: URLSearchParams) => void) {
  return http.get("/api/reports/reservations/csv", ({ request }) => {
    onRequest?.(new URL(request.url).searchParams);
    return new HttpResponse("﻿header\r\n", {
      headers: {
        "Content-Type": "text/csv;charset=UTF-8",
        "Content-Disposition": 'attachment; filename="reservations_20261001_20261031.csv"',
      },
    });
  });
}

describe("ReservationReportForm", () => {
  beforeEach(() => {
    toastError.mockClear();
    saveBlob.mockClear();
  });

  it("条件なしで押下: クエリなしで取得し、Content-Disposition のファイル名で保存する", async () => {
    let received: URLSearchParams | undefined;
    server.use(csvHandler((p) => (received = p)));
    render(<ReservationReportForm />);

    await userEvent.click(screen.getByTestId("reservation-report-submit-button"));

    await waitFor(() => expect(saveBlob).toHaveBeenCalledOnce());
    expect(saveBlob.mock.calls[0][1]).toBe("reservations_20261001_20261031.csv");
    expect(received?.toString()).toBe("");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("期間とステータスを指定: クエリに from / to / 複数の status を載せる", async () => {
    let received: URLSearchParams | undefined;
    server.use(csvHandler((p) => (received = p)));
    render(<ReservationReportForm />);

    await userEvent.type(screen.getByTestId("reservation-report-from-input"), "2026-10-01");
    await userEvent.type(screen.getByTestId("reservation-report-to-input"), "2026-10-31");
    await userEvent.click(screen.getByTestId("reservation-report-status-PENDING"));
    await userEvent.click(screen.getByTestId("reservation-report-status-APPROVED"));
    await userEvent.click(screen.getByTestId("reservation-report-submit-button"));

    await waitFor(() => expect(saveBlob).toHaveBeenCalledOnce());
    expect(received?.get("from")).toBe("2026-10-01");
    expect(received?.get("to")).toBe("2026-10-31");
    expect(received?.getAll("status")).toEqual(["PENDING", "APPROVED"]);
  });

  it("開始日が終了日より後: リクエストせずトーストで通知する", async () => {
    const spy = vi.fn();
    server.use(csvHandler(spy));
    render(<ReservationReportForm />);

    await userEvent.type(screen.getByTestId("reservation-report-from-input"), "2026-10-31");
    await userEvent.type(screen.getByTestId("reservation-report-to-input"), "2026-10-01");
    await userEvent.click(screen.getByTestId("reservation-report-submit-button"));

    expect(toastError).toHaveBeenCalledWith("開始日は終了日以前の日付にしてください。");
    expect(spy).not.toHaveBeenCalled();
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it("サーバーが 403 を返した: ダウンロードせず message をトーストで通知する", async () => {
    server.use(
      http.get("/api/reports/reservations/csv", () =>
        HttpResponse.json(
          { code: "FORBIDDEN", message: "この操作を行う権限がありません。" },
          { status: 403 },
        ),
      ),
    );
    render(<ReservationReportForm />);

    await userEvent.click(screen.getByTestId("reservation-report-submit-button"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("この操作を行う権限がありません。"),
    );
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it("通信エラー: 汎用メッセージをトーストで通知し、ボタンを再び押せる", async () => {
    server.use(http.get("/api/reports/reservations/csv", () => HttpResponse.error()));
    render(<ReservationReportForm />);

    await userEvent.click(screen.getByTestId("reservation-report-submit-button"));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("CSV のダウンロードに失敗しました。"),
    );
    expect(screen.getByTestId("reservation-report-submit-button")).toBeEnabled();
  });

  it("ステータスの選択肢: 画面共通のラベルで 4 種類を表示する（DRAFT は出さない）", () => {
    render(<ReservationReportForm />);

    expect(screen.getByText("承認待ち")).toBeInTheDocument();
    expect(screen.getByText("承認済み")).toBeInTheDocument();
    expect(screen.getByText("却下")).toBeInTheDocument();
    expect(screen.getByText("キャンセル済み")).toBeInTheDocument();
    expect(screen.queryByTestId("reservation-report-status-DRAFT")).toBeNull();
  });
});
