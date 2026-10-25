/**
 * Server Actions: reports.ts のユニットテスト
 * MSW で /api/backend/reports/* をスタブし、Next.js サーバーモジュールはモック。
 */
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { ApiClientError } from "@/lib/api-client";

// Next.js サーバー専用モジュールをモック
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// セッション・トークン取得をモック
vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({ session: { accessToken: "test-token" } }),
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

// モック後にインポート（vi.mock はホイストされる）
const { exportReservationsCsvAction } = await import("@/server/actions/reports");

const CSV_URL = "/api/backend/reports/reservations/csv";
const BOM = "﻿";
const HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";

/** BOM 付き UTF-8 の CSV 応答を返すハンドラを登録する（リクエスト URL は captured に記録する）。 */
function useCsvHandler(
  captured: { url?: URL } = {},
  disposition: string | null = 'attachment; filename="reservations_20261024.csv"',
) {
  server.use(
    http.get(CSV_URL, ({ request }) => {
      captured.url = new URL(request.url);
      const body = new TextEncoder().encode(`${BOM}${HEADER}\r\n`);
      const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...body.slice(3)]);
      const headers: Record<string, string> = { "Content-Type": "text/csv; charset=UTF-8" };
      if (disposition) headers["Content-Disposition"] = disposition;
      return new HttpResponse(bytes, { headers });
    }),
  );
  return captured;
}

describe("exportReservationsCsvAction", () => {
  it("正常時: CSV 本文の先頭に UTF-8 BOM を残して返す", async () => {
    useCsvHandler();

    const result = await exportReservationsCsvAction();

    expect(result.content.charCodeAt(0)).toBe(0xfeff);
    expect(result.content).toBe(`${BOM}${HEADER}\r\n`);
  });

  it("正常時: Content-Disposition からファイル名を取り出す", async () => {
    useCsvHandler();

    const result = await exportReservationsCsvAction();

    expect(result.filename).toBe("reservations_20261024.csv");
  });

  it("Content-Disposition が無い場合はフォールバックのファイル名を返す", async () => {
    useCsvHandler({}, null);

    const result = await exportReservationsCsvAction();

    expect(result.filename).toBe("reservations.csv");
  });

  it("from / to は datetime-local の 16 文字を秒付きに正規化して渡す", async () => {
    const captured = useCsvHandler();

    await exportReservationsCsvAction({ from: "2026-06-01T00:00", to: "2026-07-01T00:00" });

    expect(captured.url?.searchParams.get("from")).toBe("2026-06-01T00:00:00");
    expect(captured.url?.searchParams.get("to")).toBe("2026-07-01T00:00:00");
  });

  it("秒付きの from / to はそのまま渡す", async () => {
    const captured = useCsvHandler();

    await exportReservationsCsvAction({ from: "2026-06-01T00:00:30", to: "2026-07-01T00:00:00" });

    expect(captured.url?.searchParams.get("from")).toBe("2026-06-01T00:00:30");
  });

  it("status は繰り返しキーで渡す", async () => {
    const captured = useCsvHandler();

    await exportReservationsCsvAction({ status: ["PENDING", "APPROVED"] });

    expect(captured.url?.searchParams.getAll("status")).toEqual(["PENDING", "APPROVED"]);
  });

  it("未指定・空のときは from / to / status を付与しない", async () => {
    const captured = useCsvHandler();

    await exportReservationsCsvAction({ from: "", to: "", status: [] });

    expect(captured.url?.searchParams.has("from")).toBe(false);
    expect(captured.url?.searchParams.has("to")).toBe(false);
    expect(captured.url?.searchParams.has("status")).toBe(false);
  });

  it("403 のとき ApiClientError（FORBIDDEN / 403）を投げる", async () => {
    server.use(
      http.get(CSV_URL, () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "権限がありません" }, { status: 403 }),
      ),
    );

    const error = await exportReservationsCsvAction().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("400 のとき ApiClientError（VALIDATION_ERROR / 400）を投げる", async () => {
    server.use(
      http.get(CSV_URL, () =>
        HttpResponse.json({ code: "VALIDATION_ERROR", message: "不正な期間" }, { status: 400 }),
      ),
    );

    const error = await exportReservationsCsvAction({ from: "2026-06-01T00:00" }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });
});
