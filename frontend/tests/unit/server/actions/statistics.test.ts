/**
 * Server Actions: statistics.ts のユニットテスト
 * MSW で /api/backend/statistics/resources をテストごとにスタブし、Next.js サーバーモジュールはモック。
 */
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";

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
const { getResourceUsageAction } = await import("@/server/actions/statistics");

const USAGE = [
  {
    resourceId: "20000000-0000-0000-0000-000000000001",
    resourceName: "第1会議室",
    reservationCount: 12,
    totalMinutes: 1530,
  },
  {
    resourceId: "20000000-0000-0000-0000-000000000002",
    resourceName: "プロジェクター",
    reservationCount: 0,
    totalMinutes: 0,
  },
];

describe("getResourceUsageAction", () => {
  it("正常時: リソース別の集計を配列で返す", async () => {
    server.use(http.get("/api/backend/statistics/resources", () => HttpResponse.json(USAGE)));

    const result = await getResourceUsageAction();

    expect(result).toEqual(USAGE);
  });

  it("パラメータなしのときはクエリを付けない", async () => {
    let search: string | undefined;
    server.use(
      http.get("/api/backend/statistics/resources", ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json([]);
      }),
    );

    await getResourceUsageAction();

    expect(search).toBe("");
  });

  it("from・to を転送し、datetime-local の秒を補う", async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get("/api/backend/statistics/resources", ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );

    await getResourceUsageAction({ from: "2030-10-01T00:00", to: "2030-10-31T23:59" });

    expect(params?.get("from")).toBe("2030-10-01T00:00:00");
    expect(params?.get("to")).toBe("2030-10-31T23:59:00");
  });

  it("片方だけの指定はそのまま API に渡す（検証は API の 400 に任せる）", async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get("/api/backend/statistics/resources", ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json([]);
      }),
    );

    await getResourceUsageAction({ from: "2030-10-01T00:00" });

    expect(params?.get("from")).toBe("2030-10-01T00:00:00");
    expect(params?.has("to")).toBe(false);
  });

  it("400（VALIDATION_ERROR）は ApiClientError として投げる", async () => {
    server.use(
      http.get("/api/backend/statistics/resources", () =>
        HttpResponse.json(
          { code: "VALIDATION_ERROR", message: "from は to より前にしてください。" },
          { status: 400 },
        ),
      ),
    );

    await expect(
      getResourceUsageAction({ from: "2030-10-10T12:00", to: "2030-10-10T10:00" }),
    ).rejects.toMatchObject({
      name: "ApiClientError",
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("403（FORBIDDEN）は ApiClientError として投げる", async () => {
    server.use(
      http.get("/api/backend/statistics/resources", () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "権限がありません" }, { status: 403 }),
      ),
    );

    await expect(getResourceUsageAction()).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("応答の形が契約と違うときは Zod の検証で失敗する", async () => {
    server.use(
      http.get("/api/backend/statistics/resources", () =>
        HttpResponse.json([{ resourceId: "not-a-uuid", resourceName: "x" }]),
      ),
    );

    await expect(getResourceUsageAction()).rejects.toThrow();
  });
});
