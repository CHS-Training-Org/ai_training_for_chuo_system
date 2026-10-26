/**
 * api-client.ts のユニットテスト（getRaw）
 *
 * CSV など JSON 以外の本文を中継するための `getRaw` が、Response をそのまま返し、
 * トークンとクエリを付け、非 2xx では ApiClientError を投げることを検証する。
 * jsdom 環境ではブラウザ側の URL（/api/backend/*）が使われ、MSW が受ける。
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ApiClientError, createApiClient } from "@/lib/api-client";

const CSV_PATH = "/api/backend/reports/reservations/csv";

describe("createApiClient().getRaw", () => {
  it("Response をそのまま返し、本文を JSON として読まない", async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("a,b\r\n")]);
    server.use(
      http.get(
        CSV_PATH,
        () =>
          new HttpResponse(bytes, {
            headers: {
              "Content-Type": "text/csv; charset=UTF-8",
              "Content-Disposition": 'attachment; filename="reservations_20261026_104500.csv"',
            },
          }),
      ),
    );

    const res = await createApiClient(async () => "t").getRaw("/reports/reservations/csv");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("reservations_20261026_104500.csv");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("トークンを Authorization ヘッダに付ける", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(CSV_PATH, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return new HttpResponse("x");
      }),
    );

    await createApiClient(async () => "my-token").getRaw("/reports/reservations/csv");

    expect(authorization).toBe("Bearer my-token");
  });

  it("params を繰り返しキーを含めてクエリに付ける", async () => {
    let url: URL | null = null;
    server.use(
      http.get(CSV_PATH, ({ request }) => {
        url = new URL(request.url);
        return new HttpResponse("x");
      }),
    );

    await createApiClient(async () => "t").getRaw("/reports/reservations/csv", {
      from: "2037-04-01",
      status: ["APPROVED", "PENDING"],
    });

    expect(url!.searchParams.get("from")).toBe("2037-04-01");
    expect(url!.searchParams.getAll("status")).toEqual(["APPROVED", "PENDING"]);
  });

  it("非 2xx は backend の { code, message } から ApiClientError を投げる", async () => {
    server.use(
      http.get(CSV_PATH, () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "権限がありません" }, { status: 403 }),
      ),
    );

    const promise = createApiClient(async () => "t").getRaw("/reports/reservations/csv");

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
