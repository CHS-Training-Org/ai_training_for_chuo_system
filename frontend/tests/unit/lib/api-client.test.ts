/**
 * api-client.ts の getText のユニットテスト（非 JSON 応答・BOM の保持）
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ApiClientError, createApiClient } from "@/lib/api-client";

describe("getText", () => {
  it("UTF-8 BOM を文字列の先頭に残して返す", async () => {
    server.use(
      http.get("/api/backend/text", () => {
        const body = new TextEncoder().encode("あ,い\r\n");
        return new HttpResponse(new Uint8Array([0xef, 0xbb, 0xbf, ...body]), {
          headers: { "Content-Type": "text/csv; charset=UTF-8" },
        });
      }),
    );

    const { text } = await createApiClient().getText("/text");

    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text).toBe("﻿あ,い\r\n");
  });

  it("応答ヘッダを返す", async () => {
    server.use(
      http.get(
        "/api/backend/text",
        () =>
          new HttpResponse("a", {
            headers: { "Content-Disposition": 'attachment; filename="x.csv"' },
          }),
      ),
    );

    const { headers } = await createApiClient().getText("/text");

    expect(headers.get("Content-Disposition")).toBe('attachment; filename="x.csv"');
  });

  it("params を繰り返しキーを含めてクエリに付与する", async () => {
    let url: URL | undefined;
    server.use(
      http.get("/api/backend/text", ({ request }) => {
        url = new URL(request.url);
        return new HttpResponse("a");
      }),
    );

    await createApiClient().getText("/text", { from: "x", status: ["A", "B"] });

    expect(url?.searchParams.get("from")).toBe("x");
    expect(url?.searchParams.getAll("status")).toEqual(["A", "B"]);
  });

  it("非 2xx のとき ApiClientError を投げる", async () => {
    server.use(
      http.get("/api/backend/text", () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "権限がありません" }, { status: 403 }),
      ),
    );

    const error = await createApiClient()
      .getText("/text")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
