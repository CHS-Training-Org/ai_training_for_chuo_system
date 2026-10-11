// @vitest-environment node
/**
 * Route Handler: GET /api/reports/reservations/csv のユニットテスト。
 *
 * MSW でバックエンド（BACKEND_URL）をスタブし、トークンなしの 401・転送パラメータと秒補完・
 * Authorization と Accept・非 2xx の透過・BOM を含むバイト列の保持・接続失敗時の 502 を検証する。
 * Response のバイナリ本文を扱うため、jsdom ではなく node 環境で実行する。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./msw/server";

const getAccessTokenMock = vi.fn();
vi.mock("@/lib/session", () => ({
  getAccessToken: () => getAccessTokenMock(),
}));

const { GET } = await import("@/app/api/reports/reservations/csv/route");

const BACKEND = "http://backend.test";
const BACKEND_CSV = `${BACKEND}/api/reports/reservations/csv`;
const FRONT_CSV = "http://localhost:3000/api/reports/reservations/csv";

const CSV_BYTES = new Uint8Array([
  0xef,
  0xbb,
  0xbf,
  ...new TextEncoder().encode("予約ID,リソース名\r\n1,第1会議室\r\n"),
]);

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", BACKEND);
  getAccessTokenMock.mockResolvedValue("test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  getAccessTokenMock.mockReset();
});

describe("GET /api/reports/reservations/csv", () => {
  it("トークンがないとき 401 を JSON で返し、バックエンドを呼ばない", async () => {
    getAccessTokenMock.mockResolvedValue(null);
    const called = vi.fn();
    server.use(
      http.get(BACKEND_CSV, () => {
        called();
        return new HttpResponse(CSV_BYTES);
      }),
    );

    const res = await GET(new Request(FRONT_CSV));

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "UNAUTHORIZED" });
    expect(called).not.toHaveBeenCalled();
  });

  it("status・from・to を転送し、datetime-local の秒を補う", async () => {
    let received: URL | undefined;
    server.use(
      http.get(BACKEND_CSV, ({ request }) => {
        received = new URL(request.url);
        return new HttpResponse(CSV_BYTES);
      }),
    );

    await GET(
      new Request(
        `${FRONT_CSV}?status=APPROVED&status=PENDING&from=2030-06-01T00:00&to=2030-06-30T23:59`,
      ),
    );

    expect(received?.searchParams.getAll("status")).toEqual(["APPROVED", "PENDING"]);
    expect(received?.searchParams.get("from")).toBe("2030-06-01T00:00:00");
    expect(received?.searchParams.get("to")).toBe("2030-06-30T23:59:00");
  });

  it("秒付きの from・to はそのまま転送する", async () => {
    let received: URL | undefined;
    server.use(
      http.get(BACKEND_CSV, ({ request }) => {
        received = new URL(request.url);
        return new HttpResponse(CSV_BYTES);
      }),
    );

    await GET(new Request(`${FRONT_CSV}?from=2030-06-01T00:00:30&to=2030-06-30T23:59:59`));

    expect(received?.searchParams.get("from")).toBe("2030-06-01T00:00:30");
    expect(received?.searchParams.get("to")).toBe("2030-06-30T23:59:59");
  });

  it("resourceName と page は転送しない", async () => {
    let received: URL | undefined;
    server.use(
      http.get(BACKEND_CSV, ({ request }) => {
        received = new URL(request.url);
        return new HttpResponse(CSV_BYTES);
      }),
    );

    await GET(new Request(`${FRONT_CSV}?status=APPROVED&resourceName=%E4%BC%9A%E8%AD%B0&page=2`));

    expect(received?.searchParams.has("resourceName")).toBe(false);
    expect(received?.searchParams.has("page")).toBe(false);
    expect(received?.searchParams.getAll("status")).toEqual(["APPROVED"]);
  });

  it("クエリがないときはクエリなしでバックエンドを呼ぶ", async () => {
    let received: URL | undefined;
    server.use(
      http.get(BACKEND_CSV, ({ request }) => {
        received = new URL(request.url);
        return new HttpResponse(CSV_BYTES);
      }),
    );

    await GET(new Request(FRONT_CSV));

    expect(received?.search).toBe("");
  });

  it("Authorization（Bearer）と Accept: */* を付けて呼ぶ", async () => {
    let authorization: string | null = null;
    let accept: string | null = null;
    server.use(
      http.get(BACKEND_CSV, ({ request }) => {
        authorization = request.headers.get("Authorization");
        accept = request.headers.get("Accept");
        return new HttpResponse(CSV_BYTES);
      }),
    );

    await GET(new Request(FRONT_CSV));

    expect(authorization).toBe("Bearer test-token");
    expect(accept).toBe("*/*");
  });

  it("200 のとき BOM を含むバイト列とヘッダをそのまま中継する", async () => {
    server.use(
      http.get(
        BACKEND_CSV,
        () =>
          new HttpResponse(CSV_BYTES, {
            status: 200,
            headers: {
              "Content-Type": "text/csv;charset=UTF-8",
              "Content-Disposition": 'attachment; filename="reservations_20300630.csv"',
            },
          }),
      ),
    );

    const res = await GET(new Request(FRONT_CSV));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv;charset=UTF-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reservations_20300630.csv"',
    );
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(Array.from(bytes)).toEqual(Array.from(CSV_BYTES));
  });

  it.each([
    [403, { code: "FORBIDDEN", message: "操作権限がありません" }],
    [401, { code: "UNAUTHORIZED", message: "認証が必要です" }],
    [400, { code: "VALIDATION_ERROR", message: "from と to は同時に指定してください。" }],
  ])("バックエンドの %i 応答をステータスと本文のまま返す", async (status, body) => {
    server.use(http.get(BACKEND_CSV, () => HttpResponse.json(body, { status })));

    const res = await GET(new Request(FRONT_CSV));

    expect(res.status).toBe(status);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Content-Disposition")).toBeNull();
    expect(await res.json()).toEqual(body);
  });

  it("バックエンドに接続できないとき 502 を返す", async () => {
    server.use(http.get(BACKEND_CSV, () => HttpResponse.error()));

    const res = await GET(new Request(FRONT_CSV));

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: "BACKEND_UNAVAILABLE" });
  });
});
