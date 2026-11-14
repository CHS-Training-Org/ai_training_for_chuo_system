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
  tryUpdateReservationAction,
  cancelReservationAction,
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

  describe("draft オプション（下書き保存）", () => {
    const input = {
      resourceId: MOCK_RESERVATION_RESPONSE.resourceId,
      startAt: "2025-07-01T10:00",
      endAt: "2025-07-01T12:00",
      purpose: "下書きの会議",
    };

    /** POST の本文を取り出すためのハンドラーを差し込む。 */
    function captureCreateBody(): { body: Record<string, unknown> | undefined } {
      const captured: { body: Record<string, unknown> | undefined } = { body: undefined };
      server.use(
        http.post("/api/backend/reservations", async ({ request }) => {
          captured.body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(
            {
              ...MOCK_RESERVATION_RESPONSE,
              status: captured.body.draft === true ? "DRAFT" : "APPROVED",
            },
            { status: 201 },
          );
        }),
      );
      return captured;
    }

    it("draft: true を指定すると、本文に draft: true を含めて送り、DRAFT の予約を返す", async () => {
      const captured = captureCreateBody();

      const result = await createReservationAction(input, { draft: true });

      expect(captured.body?.draft).toBe(true);
      expect(result.status).toBe("DRAFT");
    });

    it("draft: true でも、日時は秒付きの形式に正規化して送る", async () => {
      const captured = captureCreateBody();

      await createReservationAction(input, { draft: true });

      expect(captured.body?.startAt).toBe("2025-07-01T10:00:00");
      expect(captured.body?.endAt).toBe("2025-07-01T12:00:00");
    });

    it("オプションを指定しないと、本文に draft を含めない（通常の申請）", async () => {
      const captured = captureCreateBody();

      const result = await createReservationAction(input);

      expect(captured.body).not.toHaveProperty("draft");
      expect(result.status).toBe("APPROVED");
    });

    it("draft: false を指定しても、本文に draft を含めない（通常の申請）", async () => {
      const captured = captureCreateBody();

      await createReservationAction(input, { draft: false });

      expect(captured.body).not.toHaveProperty("draft");
    });
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

  describe("draft オプション（下書きの更新と正式申請）", () => {
    const input = {
      startAt: "2025-07-01T14:00",
      endAt: "2025-07-01T16:00",
      purpose: "下書きの更新",
    };

    /** PUT の本文を取り出すためのハンドラーを差し込む。 */
    function captureUpdateBody(): { body: Record<string, unknown> | undefined } {
      const captured: { body: Record<string, unknown> | undefined } = { body: undefined };
      server.use(
        http.put("/api/backend/reservations/:id", async ({ params, request }) => {
          captured.body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({
            ...MOCK_RESERVATION_RESPONSE,
            id: params.id,
            status: captured.body.draft === true ? "DRAFT" : "PENDING",
          });
        }),
      );
      return captured;
    }

    it("draft: true を指定すると、本文に draft: true を含めて送り、DRAFT のまま返る", async () => {
      const captured = captureUpdateBody();

      const result = await updateReservationAction(MOCK_RESERVATION_RESPONSE.id, input, {
        draft: true,
      });

      expect(captured.body?.draft).toBe(true);
      expect(result.status).toBe("DRAFT");
    });

    it("オプションを指定しないと、本文に draft を含めない（正式申請）", async () => {
      const captured = captureUpdateBody();

      const result = await updateReservationAction(MOCK_RESERVATION_RESPONSE.id, input);

      expect(captured.body).not.toHaveProperty("draft");
      expect(result.status).toBe("PENDING");
    });

    it("日時は秒付きの形式に正規化して送る（詳細画面の「正式申請」が送る形式を含む）", async () => {
      const captured = captureUpdateBody();

      await updateReservationAction(MOCK_RESERVATION_RESPONSE.id, input);

      expect(captured.body?.startAt).toBe("2025-07-01T14:00:00");
      expect(captured.body?.endAt).toBe("2025-07-01T16:00:00");
    });

    it("正式申請の 409 時（重複）: ApiClientError をスローする", async () => {
      server.use(
        http.put("/api/backend/reservations/:id", () => {
          return HttpResponse.json(
            { code: "RESERVATION_CONFLICT", message: "重複予約があります" },
            { status: 409 },
          );
        }),
      );

      await expect(updateReservationAction(MOCK_RESERVATION_RESPONSE.id, input)).rejects.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// tryUpdateReservationAction（重複を結果の値として返す）
// ---------------------------------------------------------------------------

describe("tryUpdateReservationAction", () => {
  const input = {
    startAt: "2025-07-01T14:00",
    endAt: "2025-07-01T16:00",
    purpose: "下書きの正式申請",
  };

  it("正常時: { ok: true, reservation } を返す", async () => {
    const result = await tryUpdateReservationAction(MOCK_RESERVATION_RESPONSE.id, input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reservation.purpose).toBe("下書きの正式申請");
    }
  });

  it("409 時（重複）: スローせず { ok: false, conflict: true } を返す", async () => {
    server.use(
      http.put("/api/backend/reservations/:id", () => {
        return HttpResponse.json(
          { code: "RESERVATION_CONFLICT", message: "重複予約があります" },
          { status: 409 },
        );
      }),
    );

    const result = await tryUpdateReservationAction(MOCK_RESERVATION_RESPONSE.id, input);

    expect(result).toEqual({ ok: false, conflict: true });
  });

  it("重複以外のエラー（422）: そのままスローする", async () => {
    server.use(
      http.put("/api/backend/reservations/:id", () => {
        return HttpResponse.json(
          { code: "VALIDATION_ERROR", message: "入力内容に誤りがあります" },
          { status: 422 },
        );
      }),
    );

    await expect(tryUpdateReservationAction(MOCK_RESERVATION_RESPONSE.id, input)).rejects.toThrow();
  });

  it("draft: true を指定すると、本文に draft: true を含めて送る", async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.put("/api/backend/reservations/:id", async ({ params, request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...MOCK_RESERVATION_RESPONSE, id: params.id, status: "DRAFT" });
      }),
    );

    await tryUpdateReservationAction(MOCK_RESERVATION_RESPONSE.id, input, { draft: true });

    expect(body?.draft).toBe(true);
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
// deleteReservationAction
// ---------------------------------------------------------------------------

describe("deleteReservationAction", () => {
  it("正常時: DELETE /reservations/{id} を呼び、204 で完了する（戻り値なし）", async () => {
    let called: { method: string; pathname: string } | undefined;
    server.use(
      http.delete("/api/backend/reservations/:id", ({ request }) => {
        called = { method: request.method, pathname: new URL(request.url).pathname };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(deleteReservationAction(MOCK_RESERVATION_RESPONSE.id)).resolves.toBeUndefined();

    expect(called).toEqual({
      method: "DELETE",
      pathname: `/api/backend/reservations/${MOCK_RESERVATION_RESPONSE.id}`,
    });
  });

  it("422 時（下書き以外）: ApiClientError をスローする", async () => {
    server.use(
      http.delete("/api/backend/reservations/:id", () => {
        return HttpResponse.json(
          { code: "VALIDATION_ERROR", message: "下書きの予約のみ削除できます" },
          { status: 422 },
        );
      }),
    );

    await expect(deleteReservationAction(MOCK_RESERVATION_RESPONSE.id)).rejects.toThrow();
  });

  it("403 時（他人の下書き）: ApiClientError をスローする", async () => {
    server.use(
      http.delete("/api/backend/reservations/:id", () => {
        return HttpResponse.json(
          { code: "FORBIDDEN", message: "権限がありません" },
          { status: 403 },
        );
      }),
    );

    await expect(deleteReservationAction(MOCK_RESERVATION_RESPONSE.id)).rejects.toThrow();
  });
});
