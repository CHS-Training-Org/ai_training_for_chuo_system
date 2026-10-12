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

  it("status 指定時: クエリパラメータに status をそのまま渡す（複数指定）", async () => {
    // BFF 層（listReservationsAction）が status をバックエンドへ転送することを、
    // 実際に送信された URL のクエリパラメータを捕捉して検証する
    let receivedUrl: URL | undefined;
    server.use(
      http.get("/api/backend/reservations", ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          content: [MOCK_RESERVATION_RESPONSE],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
          first: true,
          last: true,
        });
      }),
    );

    await listReservationsAction({ status: ["PENDING", "APPROVED"] });

    expect(receivedUrl?.searchParams.getAll("status")).toEqual(["PENDING", "APPROVED"]);
  });

  it("resourceName 指定時: クエリパラメータに resourceName をそのまま渡す", async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get("/api/backend/reservations", ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          content: [MOCK_RESERVATION_RESPONSE],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
          first: true,
          last: true,
        });
      }),
    );

    await listReservationsAction({ resourceName: "会議室" });

    expect(receivedUrl?.searchParams.get("resourceName")).toBe("会議室");
  });

  it("resourceName 未指定時: クエリパラメータに resourceName を含めない", async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get("/api/backend/reservations", ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          content: [MOCK_RESERVATION_RESPONSE],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
          first: true,
          last: true,
        });
      }),
    );

    await listReservationsAction();

    expect(receivedUrl?.searchParams.has("resourceName")).toBe(false);
  });

  it("from/to 指定時（秒なし16文字）: 秒付きISOに正規化してクエリパラメータに渡す", async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get("/api/backend/reservations", ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          content: [MOCK_RESERVATION_RESPONSE],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
          first: true,
          last: true,
        });
      }),
    );

    await listReservationsAction({ from: "2025-08-01T00:00", to: "2025-08-01T23:59" });

    expect(receivedUrl?.searchParams.get("from")).toBe("2025-08-01T00:00:00");
    expect(receivedUrl?.searchParams.get("to")).toBe("2025-08-01T23:59:00");
  });

  it("from/to 未指定時: クエリパラメータに from/to を含めない", async () => {
    let receivedUrl: URL | undefined;
    server.use(
      http.get("/api/backend/reservations", ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          content: [MOCK_RESERVATION_RESPONSE],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
          first: true,
          last: true,
        });
      }),
    );

    await listReservationsAction();

    expect(receivedUrl?.searchParams.has("from")).toBe(false);
    expect(receivedUrl?.searchParams.has("to")).toBe(false);
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

    expect(result).toHaveLength(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].purpose).toBe("週次ミーティング");
  });

  it("datetime-local 形式（16文字）でも送信できる", async () => {
    const result = await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2025-07-01T10:00", // 秒なし
      endAt: "2025-07-01T12:00", // 秒なし
      purpose: "テスト",
    });

    expect(result[0].id).toBeDefined();
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

  it("draft: true 指定時: リクエストボディに draft をそのまま渡す", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post("/api/backend/reservations", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json([MOCK_RESERVATION_RESPONSE], { status: 201 });
      }),
    );

    await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2025-07-01T10:00:00",
      endAt: "2025-07-01T12:00:00",
      purpose: "下書きテスト",
      draft: true,
    });

    expect(capturedBody?.draft).toBe(true);
  });

  it("draft 未指定時: リクエストボディに draft を含めない", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post("/api/backend/reservations", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json([MOCK_RESERVATION_RESPONSE], { status: 201 });
      }),
    );

    await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2025-07-01T10:00:00",
      endAt: "2025-07-01T12:00:00",
      purpose: "通常申請テスト",
    });

    expect(capturedBody?.draft).toBeUndefined();
  });

  it("繰り返し指定時: recurrenceType と recurrenceUntil をそのまま渡し、日時のみ秒を補う", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post("/api/backend/reservations", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json([MOCK_RESERVATION_RESPONSE], { status: 201 });
      }),
    );

    await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2026-11-02T10:00",
      endAt: "2026-11-02T11:00",
      purpose: "定例会議",
      recurrenceType: "WEEKLY",
      recurrenceUntil: "2026-11-23",
    });

    expect(capturedBody?.recurrenceType).toBe("WEEKLY");
    // 終了日は日付のみで、秒は補わない
    expect(capturedBody?.recurrenceUntil).toBe("2026-11-23");
    expect(capturedBody?.startAt).toBe("2026-11-02T10:00:00");
  });

  it("繰り返し指定時: 複数件の配列をそのまま返す（seriesId・recurrenceType 付き）", async () => {
    const seriesId = "40000000-0000-0000-0000-000000000090";
    const occurrences = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"].map((date, i) => ({
      ...MOCK_RESERVATION_RESPONSE,
      id: `40000000-0000-0000-0000-00000000010${i}`,
      startAt: `${date}T10:00:00`,
      endAt: `${date}T11:00:00`,
      seriesId,
      recurrenceType: "WEEKLY",
      recurrenceUntil: "2026-11-23",
    }));
    server.use(
      http.post("/api/backend/reservations", () => HttpResponse.json(occurrences, { status: 201 })),
    );

    const result = await createReservationAction({
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2026-11-02T10:00:00",
      endAt: "2026-11-02T11:00:00",
      purpose: "定例会議",
      recurrenceType: "WEEKLY",
      recurrenceUntil: "2026-11-23",
    });

    expect(result).toHaveLength(4);
    expect(result.map((r) => r.startAt)).toEqual(occurrences.map((o) => o.startAt));
    expect(result.every((r) => r.seriesId === seriesId)).toBe(true);
    expect(result[0].recurrenceType).toBe("WEEKLY");
    expect(result[0].recurrenceUntil).toBe("2026-11-23");
  });

  it("繰り返し指定の 400（VALIDATION_ERROR）: ApiClientError をスローする", async () => {
    server.use(
      http.post("/api/backend/reservations", () =>
        HttpResponse.json(
          { code: "VALIDATION_ERROR", message: "繰り返し終了日は必須です。" },
          { status: 400 },
        ),
      ),
    );

    await expect(
      createReservationAction({
        resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
        startAt: "2026-11-02T10:00:00",
        endAt: "2026-11-02T11:00:00",
        purpose: "定例会議",
        recurrenceType: "WEEKLY",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
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

  it("submit: true 指定時: リクエストボディに submit をそのまま渡す", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.put("/api/backend/reservations/:id", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(MOCK_RESERVATION_RESPONSE, { status: 200 });
      }),
    );

    await updateReservationAction(MOCK_RESERVATION_RESPONSE.id, {
      startAt: "2025-07-01T10:00:00",
      endAt: "2025-07-01T12:00:00",
      purpose: "正式申請テスト",
      submit: true,
    });

    expect(capturedBody?.submit).toBe(true);
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
