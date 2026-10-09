import { request, type APIRequestContext } from "@playwright/test";
import { BACKEND_URL, E2E_PURPOSE_PREFIX, idTokenFor, toDatetimeLocal } from "./reservations";

/**
 * テストの前提データを API で用意する機構。
 *
 * 画面のテストでは、「同じ時間帯に承認済みの予約がある」「無効なリソースがある」のような
 * 前提を、画面を操作せずに作りたい。ここでは API を直接呼んで作る。画面で作ると、
 * 前提を作る操作そのものが失敗したときに、何のテストが落ちたのかが分からなくなるためである。
 *
 * 守ること：
 *   - 予約を作るときは、利用目的が後片付けの印（E2E_PURPOSE_PREFIX）で始まっていなければ
 *     エラーにする。印があれば、実行開始前の取りこぼし回収（cleanup.setup.ts）が拾える。
 *   - テストごとの後片付けは、作ったときと同じロールと同じ利用目的で
 *     cancelE2EReservations({ role, purpose }) を呼ぶ。MEMBER と APPROVER は自分の予約しか
 *     扱えないためである。
 *   - 承認と却下は ADMIN で行う。初期データの APPROVER は 1 名なので、APPROVER が作った
 *     予約を APPROVER 自身が承認する形になり、仕様が想定していない操作になるためである。
 */

/** 開発用ログインで保存した、ロールごとのセッションの名前。auth.setup.ts の保存先と同じ。 */
export type Role = "member" | "approver" | "admin";

/** API に送る日時の形式（オフセットなしのローカル日時、秒まで）。画面から送る形式と同じ。 */
export function toApiDateTime(d: Date): string {
  return `${toDatetimeLocal(d)}:00`;
}

/** 指定したロールで API を呼ぶためのコンテキスト。使い終わったら dispose する。 */
export async function apiAs(role: Role): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BACKEND_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${idTokenFor(role)}` },
  });
}

async function call<T>(role: Role, fn: (api: APIRequestContext) => Promise<T>): Promise<T> {
  const api = await apiAs(role);
  try {
    return await fn(api);
  } finally {
    await api.dispose();
  }
}

async function json<T>(
  res: { ok(): boolean; status(): number; text(): Promise<string>; json(): Promise<unknown> },
  what: string,
): Promise<T> {
  if (!res.ok()) {
    throw new Error(`${what}に失敗した（${res.status()}）：${await res.text()}`);
  }
  return (await res.json()) as T;
}

export type Resource = {
  id: string;
  name: string;
  category: string;
  capacity: number | null;
  requiresApproval: boolean;
  isActive: boolean;
};

export type Reservation = { id: string; status: string; purpose: string };

/** リソースの一覧を取る。ADMIN で呼ぶと無効なリソースも含まれる（要件 RES-02）。 */
export async function listResources(role: Role = "admin"): Promise<Resource[]> {
  return call(role, async (api) => {
    const body = await json<{ content?: Resource[] }>(
      await api.get("/api/resources", { params: { size: "200" } }),
      "リソース一覧の取得",
    );
    return body.content ?? [];
  });
}

/** 条件に合う有効なリソースを初期データから 1 件選ぶ。なければエラーにする（勝手に作らない）。 */
export async function findActiveResource(
  where: (r: Resource) => boolean,
  label: string,
): Promise<Resource> {
  const found = (await listResources("admin")).find((r) => r.isActive && where(r));
  if (!found) throw new Error(`条件に合う有効なリソースが初期データにない：${label}`);
  return found;
}

/** テスト用の無効なリソースの名前。何度実行しても 1 件だけにするため、名前で見分ける。 */
export const E2E_INACTIVE_RESOURCE_NAME = `${E2E_PURPOSE_PREFIX} 無効なリソース`;

/**
 * 無効なリソースを 1 件用意する。初期データに無効なリソースがないため、なければ作る。
 * リソースを消す API はないので、普段のテストで作ったリソースは開発用のデータベースに残り続ける。2 回目以降は同じものを使う。
 * 結合テストのワークフローのテストでは、テストごとに専用のデータベースが初期データに戻るので、そのたびに作る。
 */
export async function findOrCreateInactiveResource(): Promise<Resource> {
  const existing = (await listResources("admin")).find(
    (r) => r.name === E2E_INACTIVE_RESOURCE_NAME,
  );
  if (existing) {
    if (existing.isActive) {
      return call("admin", async (api) =>
        json<Resource>(
          await api.patch(`/api/resources/${existing.id}/status`, { data: { isActive: false } }),
          "リソースの無効化",
        ),
      );
    }
    return existing;
  }
  return call("admin", async (api) =>
    json<Resource>(
      await api.post("/api/resources", {
        data: {
          name: E2E_INACTIVE_RESOURCE_NAME,
          category: "EQUIPMENT",
          capacity: null,
          location: null,
          requiresApproval: false,
          isActive: false,
          description: "結合テストが使う無効なリソース。消さずに残してよい。",
        },
      }),
      "無効なリソースの作成",
    ),
  );
}

/**
 * 予約を API で作る。利用目的は後片付けの印で始まっていなければならない。
 * 承認が不要なリソースなら承認済みに、承認が必要なリソースなら承認待ちになる。
 */
export async function createReservationAs(
  role: Role,
  input: {
    resourceId: string;
    start: Date;
    end: Date;
    purpose: string;
    attendeesCount?: number | null;
  },
): Promise<Reservation> {
  if (!input.purpose.startsWith(E2E_PURPOSE_PREFIX)) {
    throw new Error(
      `利用目的が後片付けの印（${E2E_PURPOSE_PREFIX}）で始まっていない：${input.purpose}`,
    );
  }
  return call(role, async (api) =>
    json<Reservation>(
      await api.post("/api/reservations", {
        data: {
          resourceId: input.resourceId,
          startAt: toApiDateTime(input.start),
          endAt: toApiDateTime(input.end),
          purpose: input.purpose,
          attendeesCount: input.attendeesCount ?? null,
        },
      }),
      "予約の作成",
    ),
  );
}

/** 承認待ちの予約を、ADMIN で承認または却下する。 */
export async function decideAsAdmin(
  reservationId: string,
  decision: "approve" | "reject",
): Promise<void> {
  await call("admin", async (api) => {
    const steps = await json<{ id: string; reservationId: string }[]>(
      await api.get("/api/approvals/pending"),
      "承認待ち一覧の取得",
    );
    const step = steps.find((s) => s.reservationId === reservationId);
    if (!step) throw new Error(`予約 ${reservationId} の承認待ちのステップが見つからない`);
    await json(
      await api.post(`/api/approvals/${step.id}/${decision}`, {
        data: {
          comment:
            decision === "reject"
              ? "結合テストの前提データとして却下する"
              : "結合テストの前提データとして承認する",
        },
      }),
      decision === "approve" ? "承認" : "却下",
    );
  });
}

/** 予約をキャンセルする。作ったロール（または ADMIN）で呼ぶ。 */
export async function cancelReservationAs(role: Role, reservationId: string): Promise<void> {
  await call(role, async (api) => {
    await json(await api.post(`/api/reservations/${reservationId}/cancel`), "予約のキャンセル");
  });
}
