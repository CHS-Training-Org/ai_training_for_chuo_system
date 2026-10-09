/**
 * Server Actions: reservations.ts のユニットテスト
 * MSW で /api/backend/reservations/* をスタブし、Next.js サーバーモジュールはモック。
 */
import { describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import { MOCK_RESERVATION_RESPONSE } from "../../msw/handlers";

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
  listReservationsAction,
  getReservationAction,
  createReservationAction,
  updateReservationAction,
  cancelReservationAction,
} = await import("@/server/actions/reservations");

// ---------------------------------------------------------------------------
// listReservationsAction
// ---------------------------------------------------------------------------

describe("listReservationsAction", () => {
  it("正常時: 予約一覧をページネーション形式で返す", async () => {
    const result = await listReservationsAction();

    expect(result.content).toHaveLength(1);
    expect(result.content[0].id).toBe(MOCK_RESERVATION_RESPONSE.id);
    expect(result.content[0].status).toBe("APPROVED");
    expect(result.totalElements).toBe(1);
  });

  it("正常時: status フィルタパラメータを渡せる（複数指定）", async () => {
    const result = await listReservationsAction({ status: ["PENDING", "APPROVED"] });
    expect(result.content).toHaveLength(1);
  });

  it("401 時: ApiClientError をスローする", async () => {
    server.use(
      http.get("/api/backend/reservations", () => {
        return HttpResponse.json(
          { code: "UNAUTHORIZED", message: "認証が必要です" },
          { status: 401 },
        );
      }),
    );

    await expect(listReservationsAction()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getReservationAction
// ---------------------------------------------------------------------------

describe("getReservationAction", () => {
  it("正常時: 予約詳細を返す", async () => {
    const result = await getReservationAction(MOCK_RESERVATION_RESPONSE.id);

    expect(result.id).toBe(MOCK_RESERVATION_RESPONSE.id);
    expect(result.resourceName).toBe("第1会議室");
    expect(result.status).toBe("APPROVED");
  });

  it("存在しない ID: 404 エラーをスローする", async () => {
    await expect(getReservationAction("nonexistent-id")).rejects.toThrow();
  });

  it("403 時（他人の予約）: ApiClientError をスローする", async () => {
    server.use(
      http.get("/api/backend/reservations/:id", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません" },
          { status: 403 },
        );
      }),
    );

    await expect(getReservationAction(MOCK_RESERVATION_RESPONSE.id)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createReservationAction
// ---------------------------------------------------------------------------

describe("createReservationAction", () => {
  it("正常時: 作成後の予約を返す（201）", async () => {
    const result = await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2025-07-01T10:00:00",
      endAt: "2025-07-01T12:00:00",
      purpose: "週次ミーティング",
      attendeesCount: 5,
    });

    expect(result.id).toBeDefined();
    expect(result.purpose).toBe("週次ミーティング");
  });

  it("datetime-local 形式（16文字）でも送信できる", async () => {
    const result = await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2025-07-01T10:00", // 秒なし
      endAt: "2025-07-01T12:00", // 秒なし
      purpose: "テスト",
    });

    expect(result.id).toBeDefined();
  });

  it("409 時（重複予約）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/reservations", () => {
        return HttpResponse.json(
          { code: "RESERVATION_CONFLICT", message: "重複予約があります" },
          { status: 409 },
        );
      }),
    );

    await expect(
      createReservationAction({
        resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
        startAt: "2025-07-01T10:00:00",
        endAt: "2025-07-01T12:00:00",
        purpose: "テスト",
      }),
    ).rejects.toThrow();
  });

  it("draft=true: リクエストボディに draft を含め、DRAFT の予約を返す", async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.post("/api/backend/reservations", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { ...MOCK_RESERVATION_RESPONSE, status: "DRAFT" },
          { status: 201 },
        );
      }),
    );

    const result = await createReservationAction(
      {
        resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
        startAt: "2025-07-01T10:00:00",
        endAt: "2025-07-01T12:00:00",
        purpose: "検討中の打ち合わせ",
      },
      true,
    );

    expect(result.status).toBe("DRAFT");
    expect(captured).toMatchObject({ draft: true });
  });

  it("draft を省略: リクエストボディに draft を含めない（既存の振る舞いを変えない）", async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.post("/api/backend/reservations", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_RESERVATION_RESPONSE, { status: 201 });
      }),
    );

    await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2025-07-01T10:00:00",
      endAt: "2025-07-01T12:00:00",
      purpose: "通常の申請",
    });

    expect(captured).not.toBeNull();
    expect(captured!).not.toHaveProperty("draft");
  });
});

// ---------------------------------------------------------------------------
// updateReservationAction
// ---------------------------------------------------------------------------

describe("updateReservationAction", () => {
  it("正常時: 更新後の予約を返す", async () => {
    const result = await updateReservationAction(MOCK_RESERVATION_RESPONSE.id, {
      startAt: "2025-07-01T14:00:00",
      endAt: "2025-07-01T16:00:00",
      purpose: "更新後のミーティング",
    });

    expect(result.purpose).toBe("更新後のミーティング");
  });

  it("409 時（重複）: ApiClientError をスローする", async () => {
    server.use(
      http.put("/api/backend/reservations/:id", () => {
        return HttpResponse.json(
          { code: "RESERVATION_CONFLICT", message: "重複予約があります" },
          { status: 409 },
        );
      }),
    );

    await expect(
      updateReservationAction(MOCK_RESERVATION_RESPONSE.id, {
        startAt: "2025-07-01T10:00:00",
        endAt: "2025-07-01T12:00:00",
        purpose: "テスト",
      }),
    ).rejects.toThrow();
  });

  it("status='PENDING' 指定: リクエストボディに status を含める（正式申請）", async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.put("/api/backend/reservations/:id", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...MOCK_RESERVATION_RESPONSE, status: "PENDING" });
      }),
    );

    const result = await updateReservationAction(
      MOCK_RESERVATION_RESPONSE.id,
      {
        startAt: "2025-07-01T10:00:00",
        endAt: "2025-07-01T12:00:00",
        purpose: "検討中の打ち合わせ",
      },
      "PENDING",
    );

    expect(result.status).toBe("PENDING");
    expect(captured).toMatchObject({ status: "PENDING" });
  });

  it("status を省略: リクエストボディに status を含めない（内容のみ更新）", async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.put("/api/backend/reservations/:id", async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_RESERVATION_RESPONSE);
      }),
    );

    await updateReservationAction(MOCK_RESERVATION_RESPONSE.id, {
      startAt: "2025-07-01T10:00:00",
      endAt: "2025-07-01T12:00:00",
      purpose: "内容のみ更新",
    });

    expect(captured).not.toBeNull();
    expect(captured!).not.toHaveProperty("status");
  });
});

// ---------------------------------------------------------------------------
// cancelReservationAction
// ---------------------------------------------------------------------------

describe("cancelReservationAction", () => {
  it("正常時: キャンセル後の予約（status=CANCELLED）を返す", async () => {
    const result = await cancelReservationAction(MOCK_RESERVATION_RESPONSE.id);

    expect(result.status).toBe("CANCELLED");
    expect(result.id).toBe(MOCK_RESERVATION_RESPONSE.id);
  });

  it("403 時（他人の予約）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/reservations/:id/cancel", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません" },
          { status: 403 },
        );
      }),
    );

    await expect(cancelReservationAction(MOCK_RESERVATION_RESPONSE.id)).rejects.toThrow();
  });
});
