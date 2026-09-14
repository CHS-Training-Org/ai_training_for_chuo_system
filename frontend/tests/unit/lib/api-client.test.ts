/**
 * api-client.ts のユニットテスト（getRaw のエラー透過ロジック）。
 *
 * getRaw は request() を skipAssertOk: true で呼ぶため、バックエンドが4xx/5xxを返しても
 * 例外を投げず生の Response をそのまま返す。CSV帳票出力の Route Handler（route.ts）が
 * バックエンドのステータス・ボディを呼び出し元に透過転送できるのはこの前提があるため。
 * 対比として、assertOk を通る通常メソッド（get）は同条件で ApiClientError を投げることも検証する。
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ApiClientError, createApiClient } from "@/lib/api-client";
import { ResourceResponseSchema } from "@/lib/types/api";
import { MOCK_RESOURCE_RESPONSE } from "../msw/handlers";

const client = createApiClient(async () => "test-token");

describe("getRaw", () => {
  it("バックエンドが403を返しても例外を投げず、statusを保持したResponseを返す", async () => {
    server.use(
      http.get("/api/backend/reports/reservations/csv", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません。" },
          { status: 403 },
        );
      }),
    );

    const res = await client.getRaw("/reports/reservations/csv");

    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ code: "FORBIDDEN", message: "権限がありません。" });
  });

  it("バックエンドが200でCSVを返した場合、Content-Type等のヘッダを保持したResponseを返す", async () => {
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

    const res = await client.getRaw("/reports/reservations/csv");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=UTF-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="reservations.csv"');
  });
});

describe("get（対比: assertOkを通る通常メソッド）", () => {
  it("バックエンドが404を返した場合はApiClientErrorを投げる（getRawとの対比）", async () => {
    await expect(
      client.get("/resources/does-not-exist", ResourceResponseSchema),
    ).rejects.toBeInstanceOf(ApiClientError);
  });

  it("正常時はgetRawと異なりZodスキーマでパースした値を返す", async () => {
    const result = await client.get(
      `/resources/${MOCK_RESOURCE_RESPONSE.id}`,
      ResourceResponseSchema,
    );
    expect(result.id).toBe(MOCK_RESOURCE_RESPONSE.id);
  });
});
