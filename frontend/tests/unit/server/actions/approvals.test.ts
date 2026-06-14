/**
 * Server Actions: approvals.ts のユニットテスト
 * MSW で /api/backend/approvals/* をスタブし、Next.js サーバーモジュールはモック。
 */
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { handlers, MOCK_APPROVAL_STEP } from "../../msw/handlers";

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

// このテスト専用のMSWサーバー（handlers含む）
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// モック後にインポート（vi.mock はホイストされる）
const { listPendingApprovalsAction, approveAction, rejectAction } =
  await import("@/server/actions/approvals");

// ---------------------------------------------------------------------------
// listPendingApprovalsAction
// ---------------------------------------------------------------------------

describe("listPendingApprovalsAction", () => {
  it("正常時: 承認待ちステップをリスト（bare array）で返す", async () => {
    const result = await listPendingApprovalsAction();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(MOCK_APPROVAL_STEP.id);
    expect(result[0].status).toBe("PENDING");
    expect(result[0].resourceName).toBe("第1会議室");
  });

  it("空リストのとき: 空配列を返す", async () => {
    server.use(
      http.get("/api/backend/approvals/pending", () => {
        return HttpResponse.json([]);
      }),
    );

    const result = await listPendingApprovalsAction();
    expect(result).toHaveLength(0);
  });

  it("403 時（MEMBER）: ApiClientError をスローする", async () => {
    server.use(
      http.get("/api/backend/approvals/pending", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません" },
          { status: 403 },
        );
      }),
    );

    await expect(listPendingApprovalsAction()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// approveAction
// ---------------------------------------------------------------------------

describe("approveAction", () => {
  it("正常時: 承認後の ApprovalStepResponse を返す（status=APPROVED）", async () => {
    const result = await approveAction(MOCK_APPROVAL_STEP.id, "問題ありません");

    expect(result.id).toBe(MOCK_APPROVAL_STEP.id);
    expect(result.status).toBe("APPROVED");
  });

  it("正常時: コメントなし（undefined）でも承認できる", async () => {
    const result = await approveAction(MOCK_APPROVAL_STEP.id);

    expect(result.status).toBe("APPROVED");
  });

  it("404 時（不存在ステップ）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/approvals/:stepId/approve", () => {
        return HttpResponse.json(
          { code: "APPROVAL_STEP_NOT_FOUND", message: "承認ステップが存在しません" },
          { status: 404 },
        );
      }),
    );

    await expect(approveAction("non-existent-id")).rejects.toThrow();
  });

  it("409 時（重複再チェック失敗）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/approvals/:stepId/approve", () => {
        return HttpResponse.json(
          { code: "RESERVATION_CONFLICT", message: "重複する予約が存在します" },
          { status: 409 },
        );
      }),
    );

    const { ApiClientError } = await import("@/lib/api-client");
    await expect(approveAction(MOCK_APPROVAL_STEP.id)).rejects.toThrow(ApiClientError);
  });

  it("422 時（決済済みステップへの再操作）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/approvals/:stepId/approve", () => {
        return HttpResponse.json(
          { code: "APPROVAL_ALREADY_DECIDED", message: "すでに決済済みのステップです" },
          { status: 422 },
        );
      }),
    );

    const { ApiClientError } = await import("@/lib/api-client");
    await expect(approveAction(MOCK_APPROVAL_STEP.id)).rejects.toThrow(ApiClientError);
  });
});

// ---------------------------------------------------------------------------
// rejectAction
// ---------------------------------------------------------------------------

describe("rejectAction", () => {
  it("正常時: 却下後の ApprovalStepResponse を返す（status=REJECTED）", async () => {
    const result = await rejectAction(MOCK_APPROVAL_STEP.id, "日程が合いません");

    expect(result.id).toBe(MOCK_APPROVAL_STEP.id);
    expect(result.status).toBe("REJECTED");
  });

  it("400 時（コメント欠落）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/approvals/:stepId/reject", () => {
        return HttpResponse.json(
          { code: "COMMENT_REQUIRED", message: "却下理由を入力してください" },
          { status: 400 },
        );
      }),
    );

    const { ApiClientError } = await import("@/lib/api-client");
    await expect(rejectAction(MOCK_APPROVAL_STEP.id, "")).rejects.toThrow(ApiClientError);
  });

  it("404 時（不存在ステップ）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/approvals/:stepId/reject", () => {
        return HttpResponse.json(
          { code: "APPROVAL_STEP_NOT_FOUND", message: "承認ステップが存在しません" },
          { status: 404 },
        );
      }),
    );

    await expect(rejectAction("non-existent-id", "却下理由")).rejects.toThrow();
  });

  it("422 時（決済済みステップへの再操作）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/approvals/:stepId/reject", () => {
        return HttpResponse.json(
          { code: "APPROVAL_ALREADY_DECIDED", message: "すでに決済済みのステップです" },
          { status: 422 },
        );
      }),
    );

    const { ApiClientError } = await import("@/lib/api-client");
    await expect(rejectAction(MOCK_APPROVAL_STEP.id, "却下理由")).rejects.toThrow(ApiClientError);
  });
});
