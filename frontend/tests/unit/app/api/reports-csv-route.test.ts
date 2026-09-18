import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { MOCK_RESERVATIONS_CSV } from "../../msw/handlers";

vi.mock("@/lib/session", () => ({
  getAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

const { GET } = await import("@/app/api/reports/reservations/csv/route");
const { getAccessToken } = await import("@/lib/session");

describe("GET /api/reports/reservations/csv route handler", () => {
  beforeEach(() => {
    vi.mocked(getAccessToken).mockResolvedValue("test-token");
  });

  it("正常時は 200 で text/csv・Content-Disposition・本文をそのまま返す", async () => {
    const res = await GET(new Request("http://localhost:3000/api/reports/reservations/csv"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    // res.text() は TextDecoder が既定で BOM を除去してしまうため、
    // BOM を含む生バイト列であることはバイト配列で確認する。
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    // 既定の TextDecoder は BOM を自動的に取り除くため、残りの本文と一致することを確認する
    const decoded = new TextDecoder("utf-8").decode(bytes);
    expect(decoded).toBe(MOCK_RESERVATIONS_CSV.slice(1));
  });

  it("from・to・status クエリをバックエンドへ転送する", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("http://localhost:8080/api/reports/reservations/csv", ({ request }) => {
        capturedUrl = new URL(request.url);
        return new HttpResponse(MOCK_RESERVATIONS_CSV, {
          headers: { "Content-Type": "text/csv" },
        });
      }),
    );

    await GET(
      new Request(
        "http://localhost:3000/api/reports/reservations/csv?from=2026-09-01T00%3A00%3A00&to=2026-09-30T23%3A59%3A59&status=APPROVED",
      ),
    );

    expect(capturedUrl?.searchParams.get("from")).toBe("2026-09-01T00:00:00");
    expect(capturedUrl?.searchParams.get("to")).toBe("2026-09-30T23:59:59");
    expect(capturedUrl?.searchParams.get("status")).toBe("APPROVED");
  });

  it("許可リスト外のパラメータは転送しない", async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get("http://localhost:8080/api/reports/reservations/csv", ({ request }) => {
        capturedUrl = new URL(request.url);
        return new HttpResponse(MOCK_RESERVATIONS_CSV, {
          headers: { "Content-Type": "text/csv" },
        });
      }),
    );

    await GET(new Request("http://localhost:3000/api/reports/reservations/csv?size=9999&page=0"));

    expect(capturedUrl?.searchParams.has("size")).toBe(false);
    expect(capturedUrl?.searchParams.has("page")).toBe(false);
  });

  it("Authorization ヘッダを Bearer トークン付きで上流に送る", async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get("http://localhost:8080/api/reports/reservations/csv", ({ request }) => {
        capturedAuth = request.headers.get("authorization");
        return new HttpResponse(MOCK_RESERVATIONS_CSV, {
          headers: { "Content-Type": "text/csv" },
        });
      }),
    );

    await GET(new Request("http://localhost:3000/api/reports/reservations/csv"));

    expect(capturedAuth).toBe("Bearer test-token");
  });

  it("バックエンドが 403 を返した場合はそのまま透過する", async () => {
    server.use(
      http.get("http://localhost:8080/api/reports/reservations/csv", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "この操作を行う権限がありません。" },
          { status: 403 },
        );
      }),
    );

    const res = await GET(new Request("http://localhost:3000/api/reports/reservations/csv"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("バックエンドが 500 を返した場合はそのまま透過する", async () => {
    server.use(
      http.get("http://localhost:8080/api/reports/reservations/csv", () => {
        return HttpResponse.json(
          { code: "INTERNAL_SERVER_ERROR", message: "予期しないエラーが発生しました。" },
          { status: 500 },
        );
      }),
    );

    const res = await GET(new Request("http://localhost:3000/api/reports/reservations/csv"));

    expect(res.status).toBe(500);
  });

  it("トークンが取得できない場合はバックエンドを呼ばずに 401 を返す", async () => {
    vi.mocked(getAccessToken).mockResolvedValueOnce(null);

    const res = await GET(new Request("http://localhost:3000/api/reports/reservations/csv"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });
});
