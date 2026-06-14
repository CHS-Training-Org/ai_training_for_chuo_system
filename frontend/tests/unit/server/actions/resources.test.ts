/**
 * Server Actions: resources.ts のユニットテスト
 * MSW で /api/backend/resources/* をスタブし、Next.js サーバーモジュールはモック。
 */
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { MOCK_RESOURCE_RESPONSE, MOCK_AVAILABILITY_SLOTS } from "../../msw/handlers";

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
const {
  listResourcesAction,
  getResourceAction,
  getAvailabilityAction,
  createResourceAction,
  updateResourceAction,
  changeResourceStatusAction,
} = await import("@/server/actions/resources");

// ---------------------------------------------------------------------------
// listResourcesAction
// ---------------------------------------------------------------------------

describe("listResourcesAction", () => {
  it("正常時: リソース一覧をページネーション形式で返す", async () => {
    const result = await listResourcesAction();

    expect(result.content).toHaveLength(1);
    expect(result.content[0].id).toBe(MOCK_RESOURCE_RESPONSE.id);
    expect(result.content[0].name).toBe(MOCK_RESOURCE_RESPONSE.name);
    expect(result.content[0].category).toBe("ROOM");
    expect(result.totalElements).toBe(1);
  });

  it("正常時: カテゴリフィルタパラメータを渡せる", async () => {
    // MSW がクエリパラメータを受け取っても同じレスポンスを返す（パラメータ検証はBE側）
    const result = await listResourcesAction({ category: "ROOM" });
    expect(result.content).toHaveLength(1);
  });

  it("401 時: ApiClientError をスローする", async () => {
    server.use(
      http.get("/api/backend/resources", () => {
        return HttpResponse.json(
          { code: "UNAUTHORIZED", message: "認証が必要です" },
          { status: 401 },
        );
      }),
    );

    await expect(listResourcesAction()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getResourceAction
// ---------------------------------------------------------------------------

describe("getResourceAction", () => {
  it("正常時: リソース詳細を返す", async () => {
    const result = await getResourceAction(MOCK_RESOURCE_RESPONSE.id);

    expect(result.id).toBe(MOCK_RESOURCE_RESPONSE.id);
    expect(result.name).toBe(MOCK_RESOURCE_RESPONSE.name);
    expect(result.isActive).toBe(true);
  });

  it("存在しない ID: 404 エラーをスローする", async () => {
    await expect(getResourceAction("nonexistent-id")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getAvailabilityAction
// ---------------------------------------------------------------------------

describe("getAvailabilityAction", () => {
  it("正常時: 占有スロット配列を返す", async () => {
    const result = await getAvailabilityAction(
      MOCK_RESOURCE_RESPONSE.id,
      "2025-06-01T00:00:00",
      "2025-06-07T23:59:59",
    );

    expect(result).toHaveLength(1);
    expect(result[0].reservationId).toBe(MOCK_AVAILABILITY_SLOTS[0].reservationId);
    expect(result[0].startAt).toBe(MOCK_AVAILABILITY_SLOTS[0].startAt);
    expect(result[0].endAt).toBe(MOCK_AVAILABILITY_SLOTS[0].endAt);
  });

  it("空き期間の場合: 空の配列を返す", async () => {
    server.use(
      http.get("/api/backend/resources/:id/availability", () => {
        return HttpResponse.json([]);
      }),
    );

    const result = await getAvailabilityAction(
      MOCK_RESOURCE_RESPONSE.id,
      "2025-07-01T00:00:00",
      "2025-07-07T23:59:59",
    );

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// createResourceAction（ADMIN）
// ---------------------------------------------------------------------------

describe("createResourceAction", () => {
  it("正常時: 作成後のリソースを返す", async () => {
    const result = await createResourceAction({
      name: "新会議室",
      category: "ROOM",
      requiresApproval: false,
      isActive: true,
    });

    expect(result.name).toBe("新会議室");
    expect(result.id).toBeDefined();
  });

  it("401 時: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/resources", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません" },
          { status: 403 },
        );
      }),
    );

    await expect(
      createResourceAction({
        name: "test",
        category: "ROOM",
        requiresApproval: false,
        isActive: true,
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// changeResourceStatusAction（ADMIN）
// ---------------------------------------------------------------------------

describe("changeResourceStatusAction", () => {
  it("正常時: 更新後のリソース（isActive 変更済み）を返す", async () => {
    const result = await changeResourceStatusAction(MOCK_RESOURCE_RESPONSE.id, false);

    expect(result.isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateResourceAction（ADMIN）
// ---------------------------------------------------------------------------

describe("updateResourceAction", () => {
  it("正常時: 更新後のリソースを返す", async () => {
    const result = await updateResourceAction(MOCK_RESOURCE_RESPONSE.id, {
      name: "第1会議室（改装後）",
      category: "ROOM",
      requiresApproval: false,
      isActive: true,
    });

    expect(result.name).toBe("第1会議室（改装後）");
  });
});
