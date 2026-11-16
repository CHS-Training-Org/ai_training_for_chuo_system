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
  submitReservationAction,
  deleteReservationAction,
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

// ---------------------------------------------------------------------------
// 下書き（DRAFT）: draft 送信 / 正式申請 / 削除
// ---------------------------------------------------------------------------

describe("下書き保存・正式申請・削除", () => {
  const INPUT = {
    resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
    startAt: "2025-07-01T10:00",
    endAt: "2025-07-01T12:00",
    purpose: "下書き",
  };

  it("createReservationAction: draft: true がボディにそのまま送信される", async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.post("/api/backend/reservations", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { ...MOCK_RESERVATION_RESPONSE, status: "DRAFT" },
          { status: 201 },
        );
      }),
    );

    const result = await createReservationAction({ ...INPUT, draft: true });

    expect(sent).toMatchObject({ draft: true, startAt: "2025-07-01T10:00:00" });
    expect(result.status).toBe("DRAFT");
  });

  it("createReservationAction: draft 未指定ならボディに draft キーを含めない", async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.post("/api/backend/reservations", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_RESERVATION_RESPONSE, { status: 201 });
      }),
    );

    await createReservationAction(INPUT);

    expect(sent).not.toHaveProperty("draft");
  });

  it("submitReservationAction: submit: true を付けて PUT し、遷移後の予約を返す", async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.put("/api/backend/reservations/:id", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...MOCK_RESERVATION_RESPONSE, status: "PENDING" });
      }),
    );

    const result = await submitReservationAction(MOCK_RESERVATION_RESPONSE.id, {
      startAt: "2025-07-01T10:00",
      endAt: "2025-07-01T12:00",
      purpose: "下書き",
    });

    expect(sent).toMatchObject({ submit: true, endAt: "2025-07-01T12:00:00" });
    expect(result.status).toBe("PENDING");
  });

  it("updateReservationAction: submit を付けない（DRAFT のまま更新）", async () => {
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.put("/api/backend/reservations/:id", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_RESERVATION_RESPONSE);
      }),
    );

    await updateReservationAction(MOCK_RESERVATION_RESPONSE.id, {
      startAt: "2025-07-01T10:00:00",
      endAt: "2025-07-01T12:00:00",
      purpose: "更新",
    });

    expect(sent).not.toHaveProperty("submit");
  });

  it("submitReservationAction: 409 は code=RESERVATION_CONFLICT の ApiClientError", async () => {
    server.use(
      http.put("/api/backend/reservations/:id", () =>
        HttpResponse.json({ code: "RESERVATION_CONFLICT", message: "重複" }, { status: 409 }),
      ),
    );

    await expect(
      submitReservationAction(MOCK_RESERVATION_RESPONSE.id, {
        startAt: "2025-07-01T10:00:00",
        endAt: "2025-07-01T12:00:00",
        purpose: "x",
      }),
    ).rejects.toMatchObject({ status: 409, code: "RESERVATION_CONFLICT" });
  });

  it("deleteReservationAction: 204 で正常終了する", async () => {
    await expect(deleteReservationAction(MOCK_RESERVATION_RESPONSE.id)).resolves.toBeUndefined();
  });

  it("deleteReservationAction: 422（DRAFT 以外）は ApiClientError をスローする", async () => {
    server.use(
      http.delete("/api/backend/reservations/:id", () =>
        HttpResponse.json({ code: "VALIDATION_ERROR", message: "DRAFT のみ" }, { status: 422 }),
      ),
    );

    await expect(deleteReservationAction(MOCK_RESERVATION_RESPONSE.id)).rejects.toMatchObject({
      status: 422,
    });
  });

  it("deleteReservationAction: 403（本人以外）は ApiClientError をスローする", async () => {
    server.use(
      http.delete("/api/backend/reservations/:id", () =>
        HttpResponse.json({ code: "FORBIDDEN", message: "権限なし" }, { status: 403 }),
      ),
    );

    await expect(deleteReservationAction(MOCK_RESERVATION_RESPONSE.id)).rejects.toMatchObject({
      status: 403,
    });
  });
});
