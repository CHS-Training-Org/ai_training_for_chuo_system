/**
 * Route Handler（GET /api/reports/reservations/csv）のユニットテスト
 * MSW で /api/backend/reports/reservations/csv をスタブし、Next.js サーバーモジュールはモック。
 */
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("@/lib/session", () => ({
  getSession: vi.fn().mockResolvedValue({ session: { accessToken: "test-token" } }),
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

const { GET } = await import("@/app/api/reports/reservations/csv/route");

const CSV_BODY = "﻿予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態\r\n";

function csvResponse() {
  return new HttpResponse(new TextEncoder().encode(CSV_BODY), {
    headers: {
      "Content-Type": "text/csv;charset=UTF-8",
      "Content-Disposition": 'attachment; filename="reservations_20261029.csv"',
    },
  });
}

function call(query = "") {
  return GET(new Request(`http://localhost/api/reports/reservations/csv${query}`));
}

describe("GET /api/reports/reservations/csv", () => {
  it("正常時: CSV を本文そのままで返し、Content-Type と Content-Disposition を引き継ぐ", async () => {
    server.use(http.get("/api/backend/reports/reservations/csv", () => csvResponse()));

    const res = await call();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reservations_20261029.csv"',
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    // TextDecoder は既定で BOM を取り除くため、ignoreBOM で保持して比較する
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(CSV_BODY);
  });

  it("クエリ: from / to / 複数の status をバックエンドへ転送する", async () => {
    let received: URLSearchParams | undefined;
    server.use(
      http.get("/api/backend/reports/reservations/csv", ({ request }) => {
        received = new URL(request.url).searchParams;
        return csvResponse();
      }),
    );

    await call("?from=2026-10-01&to=2026-10-31&status=PENDING&status=APPROVED");

    expect(received?.get("from")).toBe("2026-10-01");
    expect(received?.get("to")).toBe("2026-10-31");
    expect(received?.getAll("status")).toEqual(["PENDING", "APPROVED"]);
  });

  it("クエリ未指定: from / to / status を付けない", async () => {
    let received: URLSearchParams | undefined;
    server.use(
      http.get("/api/backend/reports/reservations/csv", ({ request }) => {
        received = new URL(request.url).searchParams;
        return csvResponse();
      }),
    );

    await call();

    expect(received?.has("from")).toBe(false);
    expect(received?.has("to")).toBe(false);
    expect(received?.has("status")).toBe(false);
  });

  it("403 時: バックエンドの code と message をそのままのステータスで中継する", async () => {
    server.use(
      http.get("/api/backend/reports/reservations/csv", () =>
        HttpResponse.json(
          { code: "FORBIDDEN", message: "この操作を行う権限がありません。" },
          { status: 403 },
        ),
      ),
    );

    const res = await call();

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      code: "FORBIDDEN",
      message: "この操作を行う権限がありません。",
    });
  });

  it("400 時: VALIDATION_ERROR を中継する", async () => {
    server.use(
      http.get("/api/backend/reports/reservations/csv", () =>
        HttpResponse.json(
          { code: "VALIDATION_ERROR", message: "from は to 以前の日付を指定してください。" },
          { status: 400 },
        ),
      ),
    );

    const res = await call("?from=2026-10-31&to=2026-10-01");

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
  });

  it("想定外の例外: 500 と INTERNAL_SERVER_ERROR を返す", async () => {
    server.use(http.get("/api/backend/reports/reservations/csv", () => HttpResponse.error()));

    const res = await call();

    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe("INTERNAL_SERVER_ERROR");
  });
});
