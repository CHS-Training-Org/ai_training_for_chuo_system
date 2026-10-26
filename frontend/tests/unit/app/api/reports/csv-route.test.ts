/**
 * 予約 CSV 中継 Route Handler（GET）のユニットテスト
 *
 * Route Handler の GET を Request で直接呼び、getAccessToken は vi.mock、backend は MSW で返す。
 * 本文とヘッダの中継（BOM を含むバイト列を保つこと）、backend へ渡すパラメータの選別、
 * エラー時のリダイレクト先を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw/server";

const { getAccessToken } = vi.hoisted(() => ({ getAccessToken: vi.fn() }));
vi.mock("@/lib/session", () => ({ getAccessToken }));

import { GET } from "@/app/api/reports/reservations/csv/route";

const BACKEND_URL_PATH = "/api/backend/reports/reservations/csv";
const ROUTE_URL = "http://localhost:3000/api/reports/reservations/csv";

function request(query = ""): Request {
  return new Request(`${ROUTE_URL}${query}`);
}

/** backend が受けたリクエストを記録しつつ、指定のレスポンスを返すハンドラを登録する。 */
function stubBackend(respond: () => Response) {
  const received: Request[] = [];
  server.use(
    http.get(BACKEND_URL_PATH, ({ request }) => {
      received.push(request);
      return respond();
    }),
  );
  return received;
}

describe("GET /api/reports/reservations/csv（Route Handler）", () => {
  beforeEach(() => {
    getAccessToken.mockReset();
    getAccessToken.mockResolvedValue("test-token");
  });

  describe("成功時の中継", () => {
    const csvBytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode("予約ID,リソース名\r\n"),
    ]);

    function csvResponse() {
      return new HttpResponse(csvBytes, {
        headers: {
          "Content-Type": "text/csv;charset=UTF-8",
          "Content-Disposition": 'attachment; filename="reservations_20261026_104500.csv"',
        },
      });
    }

    it("本文（BOM を含むバイト列）と Content-Type / Content-Disposition を中継する", async () => {
      stubBackend(csvResponse);

      const res = await GET(request());

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/csv;charset=UTF-8");
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="reservations_20261026_104500.csv"',
      );
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      const body = new Uint8Array(await res.arrayBuffer());
      expect(Array.from(body.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
      expect(body).toEqual(csvBytes);
    });

    it("サーバー側で取得した JWT を Authorization に付けて backend を呼ぶ", async () => {
      const received = stubBackend(csvResponse);

      await GET(request());

      expect(received).toHaveLength(1);
      expect(received[0].headers.get("Authorization")).toBe("Bearer test-token");
    });

    it("from / to / status（複数）を backend に渡す", async () => {
      const received = stubBackend(csvResponse);

      await GET(request("?from=2037-04-01&to=2037-04-30&status=APPROVED&status=PENDING"));

      const url = new URL(received[0].url);
      expect(url.searchParams.get("from")).toBe("2037-04-01");
      expect(url.searchParams.get("to")).toBe("2037-04-30");
      expect(url.searchParams.getAll("status")).toEqual(["APPROVED", "PENDING"]);
    });

    it("空文字のパラメータと余分なキーは backend に渡さない", async () => {
      const received = stubBackend(csvResponse);

      await GET(request("?from=&to=%20&status=&status=APPROVED&page=3&foo=bar"));

      const url = new URL(received[0].url);
      expect(url.searchParams.has("from")).toBe(false);
      expect(url.searchParams.has("to")).toBe(false);
      expect(url.searchParams.getAll("status")).toEqual(["APPROVED"]);
      expect(url.searchParams.has("page")).toBe(false);
      expect(url.searchParams.has("foo")).toBe(false);
    });

    it("条件がなければクエリなしで backend を呼ぶ", async () => {
      const received = stubBackend(csvResponse);

      await GET(request());

      expect(new URL(received[0].url).search).toBe("");
    });
  });

  describe("認証", () => {
    it("トークンがなければ backend を呼ばず /auth/signin へ 303 でリダイレクトする", async () => {
      getAccessToken.mockResolvedValue(null);
      const received = stubBackend(() => new HttpResponse("x"));

      const res = await GET(request());

      expect(res.status).toBe(303);
      expect(res.headers.get("Location")).toBe("http://localhost:3000/auth/signin");
      expect(received).toHaveLength(0);
    });

    it("backend が 401 なら /auth/signin へ 303 でリダイレクトする", async () => {
      stubBackend(() =>
        HttpResponse.json({ code: "UNAUTHORIZED", message: "認証が必要です" }, { status: 401 }),
      );

      const res = await GET(request());

      expect(res.status).toBe(303);
      expect(res.headers.get("Location")).toBe("http://localhost:3000/auth/signin");
    });
  });

  describe("エラー時のリダイレクト", () => {
    it("backend が 403 なら /admin/reports?error=FORBIDDEN へ 303 でリダイレクトする", async () => {
      stubBackend(() =>
        HttpResponse.json({ code: "FORBIDDEN", message: "権限がありません" }, { status: 403 }),
      );

      const res = await GET(request());

      expect(res.status).toBe(303);
      expect(res.headers.get("Location")).toBe(
        "http://localhost:3000/admin/reports?error=FORBIDDEN",
      );
    });

    it("backend が 400 なら error=VALIDATION_ERROR で戻す", async () => {
      stubBackend(() =>
        HttpResponse.json({ code: "VALIDATION_ERROR", message: "不正" }, { status: 400 }),
      );

      const res = await GET(request("?from=2037-04-30&to=2037-04-01"));

      expect(res.status).toBe(303);
      expect(res.headers.get("Location")).toBe(
        "http://localhost:3000/admin/reports?error=VALIDATION_ERROR",
      );
    });

    it("backend が 500（JSON なし）なら error=HTTP_500 で戻す", async () => {
      stubBackend(() => new HttpResponse("oops", { status: 500 }));

      const res = await GET(request());

      expect(res.status).toBe(303);
      expect(res.headers.get("Location")).toBe(
        "http://localhost:3000/admin/reports?error=HTTP_500",
      );
    });

    it("エラーコードは URL エンコードして付ける", async () => {
      stubBackend(() => HttpResponse.json({ code: "A B&C", message: "x" }, { status: 400 }));

      const res = await GET(request());

      expect(res.headers.get("Location")).toBe(
        "http://localhost:3000/admin/reports?error=A%20B%26C",
      );
    });

    it("backend に届かない（ApiClientError 以外の例外）なら error=INTERNAL_SERVER_ERROR で戻す", async () => {
      server.use(http.get(BACKEND_URL_PATH, () => HttpResponse.error()));

      const res = await GET(request());

      expect(res.status).toBe(303);
      expect(res.headers.get("Location")).toBe(
        "http://localhost:3000/admin/reports?error=INTERNAL_SERVER_ERROR",
      );
    });
  });
});
