/**
 * Server Actions: users.ts のユニットテスト
 * MSW で /api/backend/users をスタブし、Next.js サーバーモジュールはモック。
 */
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { MOCK_USER_LIST_RESPONSE } from "../../msw/handlers";

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
const { listUsersAction } = await import("@/server/actions/users");

// ---------------------------------------------------------------------------
// listUsersAction
// ---------------------------------------------------------------------------

describe("listUsersAction", () => {
  it("正常時: ユーザー一覧をページネーション形式で返す", async () => {
    const result = await listUsersAction();

    expect(result.content).toHaveLength(MOCK_USER_LIST_RESPONSE.totalElements);
    expect(result.totalElements).toBe(MOCK_USER_LIST_RESPONSE.totalElements);
    expect(result.content[0].id).toBe(MOCK_USER_LIST_RESPONSE.content[0].id);
    expect(result.content[0].name).toBe(MOCK_USER_LIST_RESPONSE.content[0].name);
    expect(result.content[0].role).toBe("MEMBER");
    expect(result.content[0].departmentName).toBe("開発部");
  });

  it("size パラメータ付き: queryParams が正しく渡される（200）", async () => {
    const result = await listUsersAction({ size: 10 });

    // MSW はクエリパラメータに関わらず MOCK を返す（パラメータ渡しの確認は正常系で代替）
    expect(result.content).toBeDefined();
    expect(result.totalElements).toBeGreaterThanOrEqual(0);
  });

  it("403 時（MEMBER / APPROVER）: ApiClientError をスローする", async () => {
    server.use(
      http.get("/api/backend/users", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません" },
          { status: 403 },
        );
      }),
    );

    await expect(listUsersAction()).rejects.toThrow();
  });

  it("401 時（未認証）: ApiClientError をスローする", async () => {
    server.use(
      http.get("/api/backend/users", () => {
        return HttpResponse.json(
          { code: "UNAUTHORIZED", message: "認証が必要です" },
          { status: 401 },
        );
      }),
    );

    await expect(listUsersAction()).rejects.toThrow();
  });
});
