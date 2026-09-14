/**
 * CSV 帳票出力 Route Handler（route.ts）のユニットテスト。
 *
 * - セッションなし時はバックエンドを呼ばず401 JSONを返す（早期リターン）
 * - セッションあり時は、バックエンドの status・Content-Type・Content-Disposition を
 *   そのまま呼び出し元に転送する（200/403 の両方で確認する）
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { http, HttpResponse } from "msw";
import { server } from "../../../../../msw/server";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

const { getSession } = await import("@/lib/session");
const { GET } = await import("@/app/api/reports/reservations/csv/route");

const REQUEST_URL = "http://localhost/api/reports/reservations/csv";

afterEach(() => {
  vi.mocked(getSession).mockReset();
});

describe("GET /api/reports/reservations/csv", () => {
  it("セッションがない場合、バックエンドを呼ばず401 JSONを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    let backendCalled = false;
    server.use(
      http.get("/api/backend/reports/reservations/csv", () => {
        backendCalled = true;
        return HttpResponse.text("id,name\n");
      }),
    );

    const res = await GET(new NextRequest(REQUEST_URL));

    expect(res.status).toBe(401);
    expect(backendCalled).toBe(false);
    const body = await res.json();
    expect(body).toEqual({ code: "UNAUTHORIZED", message: "認証が必要です。" });
  });

  it("バックエンドが200でCSVを返した場合、statusとContent-Type・Content-Dispositionを転送する", async () => {
    vi.mocked(getSession).mockResolvedValue({ session: { accessToken: "test-token" } } as never);
    server.use(
      http.get("/api/backend/reports/reservations/csv", () => {
        return new HttpResponse("id,name\n1,test\n", {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=UTF-8",
            "Content-Disposition": 'attachment; filename="reservations.csv"',
          },
        });
      }),
    );

    const res = await GET(new NextRequest(REQUEST_URL));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=UTF-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="reservations.csv"');
    const body = await res.text();
    expect(body).toBe("id,name\n1,test\n");
  });

  it("バックエンドが403を返した場合、statusとボディを転送する", async () => {
    vi.mocked(getSession).mockResolvedValue({ session: { accessToken: "test-token" } } as never);
    server.use(
      http.get("/api/backend/reports/reservations/csv", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません。" },
          { status: 403 },
        );
      }),
    );

    const res = await GET(new NextRequest(REQUEST_URL));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ code: "FORBIDDEN", message: "権限がありません。" });
  });
});
