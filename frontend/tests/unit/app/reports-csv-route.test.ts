/**
 * Route Handler: app/api/reports/reservations/csv/route.ts のユニットテスト
 * MSW で BE（BACKEND_URL）の GET /api/reports/reservations/csv をスタブする。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";

const getAccessToken = vi.fn();
vi.mock("@/lib/session", () => ({
  getAccessToken: () => getAccessToken(),
}));

const { GET } = await import("@/app/api/reports/reservations/csv/route");

const BE_URL = "http://localhost:8080/api/reports/reservations/csv";
const CSV_BODY = "﻿予約ID,リソース名\r\n";

function call(query = ""): Promise<Response> {
  return GET(new Request(`http://localhost:3000/api/reports/reservations/csv${query}`));
}

function csvHandler(onRequest?: (req: Request) => void) {
  return http.get(BE_URL, ({ request }) => {
    onRequest?.(request);
    return new HttpResponse(CSV_BODY, {
      status: 200,
      headers: {
        "Content-Type": "text/csv;charset=UTF-8",
        "Content-Disposition": 'attachment; filename="reservations_20261014_153000.csv"',
      },
    });
  });
}

/** 303 の Location を返す。相対パスであること（内部ホストを含まないこと）も検証する。 */
function locationOf(res: Response): URL {
  expect(res.status).toBe(303);
  const location = res.headers.get("Location") ?? "";
  expect(location.startsWith("/admin/reports?")).toBe(true);
  return new URL(location, "http://localhost:3000");
}

beforeEach(() => {
  getAccessToken.mockReset();
  getAccessToken.mockResolvedValue("test-token");
});

describe("GET /api/reports/reservations/csv（成功）", () => {
  it("BE の CSV を本文ごと中継し、Content-Type と Content-Disposition を引き継ぐ", async () => {
    server.use(csvHandler());

    const res = await call();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reservations_20261014_153000.csv"',
    );
    // text() は UTF-8 の BOM を取り除くため、バイト列で比較する（BOM が中継で失われないことの検証）。
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(CSV_BODY);
  });

  it("Cache-Control: no-store と X-Content-Type-Options: nosniff を付与する", async () => {
    server.use(csvHandler());

    const res = await call();

    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("JWT を Authorization ヘッダで BE に付与する", async () => {
    let auth: string | null = null;
    server.use(csvHandler((req) => (auth = req.headers.get("Authorization"))));

    await call();

    expect(auth).toBe("Bearer test-token");
  });

  it("status を複数転送する", async () => {
    let url: URL | null = null;
    server.use(csvHandler((req) => (url = new URL(req.url))));

    await call("?status=PENDING&status=APPROVED");

    expect(url!.searchParams.getAll("status")).toEqual(["PENDING", "APPROVED"]);
  });

  it("from / to の秒を補って転送する（datetime-local の 16 桁）", async () => {
    let url: URL | null = null;
    server.use(csvHandler((req) => (url = new URL(req.url))));

    await call("?from=2026-10-01T09:00&to=2026-11-01T18:30");

    expect(url!.searchParams.get("from")).toBe("2026-10-01T09:00:00");
    expect(url!.searchParams.get("to")).toBe("2026-11-01T18:30:00");
  });

  it("空欄のパラメータは BE に送らない", async () => {
    let url: URL | null = null;
    server.use(csvHandler((req) => (url = new URL(req.url))));

    await call("?from=&to=&status=");

    expect(url!.searchParams.has("from")).toBe(false);
    expect(url!.searchParams.has("to")).toBe(false);
    expect(url!.searchParams.has("status")).toBe(false);
  });
});

describe("GET /api/reports/reservations/csv（失敗 → /admin/reports へ 303）", () => {
  it("JWT が無いときは BE を呼ばず error=UNAUTHORIZED で戻す", async () => {
    getAccessToken.mockResolvedValue(null);
    let called = false;
    server.use(csvHandler(() => (called = true)));

    const loc = locationOf(await call());

    expect(loc.pathname).toBe("/admin/reports");
    expect(loc.searchParams.get("error")).toBe("UNAUTHORIZED");
    expect(called).toBe(false);
  });

  it.each([
    [400, "VALIDATION_ERROR"],
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [500, "INTERNAL_SERVER_ERROR"],
  ])("BE が %i のとき BE の code（%s）で戻す", async (status, code) => {
    server.use(http.get(BE_URL, () => HttpResponse.json({ code, message: "x" }, { status })));

    const loc = locationOf(await call());

    expect(loc.pathname).toBe("/admin/reports");
    expect(loc.searchParams.get("error")).toBe(code);
  });

  it("エラー本文が JSON でないときは HTTP_<status> で戻す", async () => {
    server.use(http.get(BE_URL, () => new HttpResponse("Bad Gateway", { status: 502 })));

    const loc = locationOf(await call());

    expect(loc.searchParams.get("error")).toBe("HTTP_502");
  });

  it("code が想定外の形式のときは HTTP_<status> で戻す（任意文字列を引き回さない）", async () => {
    server.use(
      http.get(BE_URL, () =>
        HttpResponse.json({ code: "<script>alert(1)</script>" }, { status: 400 }),
      ),
    );

    const loc = locationOf(await call());

    expect(loc.searchParams.get("error")).toBe("HTTP_400");
  });

  it("BE に接続できないときは INTERNAL_SERVER_ERROR で戻す", async () => {
    server.use(http.get(BE_URL, () => HttpResponse.error()));

    const loc = locationOf(await call());

    expect(loc.searchParams.get("error")).toBe("INTERNAL_SERVER_ERROR");
  });
});
