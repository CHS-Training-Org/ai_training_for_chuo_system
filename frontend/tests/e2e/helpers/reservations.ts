import fs from "node:fs";
import path from "node:path";
import { request, type TestInfo } from "@playwright/test";

/**
 * 予約を作るテストの前提データと後片付けを担う機構。
 *
 * 予約申請のテストはデータベースに行を作るため、何もしないと 2 回目の実行が
 * 重複予約（409 RESERVATION_CONFLICT）で落ちる。これを「実行のたびに変わる日時」で
 * 避けると、テストが時計に依存することになり、再現性が失われる。
 * ここでは代わりに、次の 2 つで解決する。
 *
 *   1. テストごとに決まった時間帯を割り当てる（時計を読まない）
 *   2. テストが作った予約を、そのテストの終了時に片付ける
 *
 * 後片付けにキャンセルを使うのは、重複判定の条件が
 * `status IN ('PENDING', 'APPROVED')` だからである。キャンセルすると対象から外れ、
 * 同じ時間帯を再び予約できる。削除 API は存在しないため、消す方向へ「改善」しない。
 *
 * ロールの指定に注意が要る。予約一覧の取得もキャンセルも、MEMBER と APPROVER は
 * 自分の予約しか扱えず、全件を扱えるのは ADMIN だけである（要件定義書の API 権限
 * マトリクス）。テスト単位の後片付けは予約を作ったロールで、実行開始前の取りこぼし
 * 回収は ADMIN で行う。
 */

/** テストが作った予約を見分けるための印。利用目的の先頭に付ける。 */
export const E2E_PURPOSE_PREFIX = "[e2e]";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
const AUTH_DIR = path.join(__dirname, "..", "..", "..", "playwright", ".auth");

/** 重複判定の対象になる（＝枠を塞ぐ）ステータス。 */
const OCCUPYING_STATUSES = ["PENDING", "APPROVED"];

/**
 * 時間帯の割り当て。
 *
 * 基準日から、テストごとに決まった分だけずらした 1 時間の枠を返す。時計は読まない。
 * ずらす量は次の 2 つの和で決める。
 *
 *   - ワーカー番号ごとのブロック：同時に走るテストは必ず別のワーカーにいるため、
 *     ブロックを分けておけば並列実行中に枠がぶつからない
 *   - テスト名から計算した枠番号：同じテストは毎回同じ枠になる
 *
 * 同じワーカー内でテスト名の枠番号が偶然重なっても、先に走ったテストの後片付けが
 * 済んでいるため衝突しない（同一ワーカー内のテストは直列に実行される）。
 */
const SLOT_BASE_UTC = Date.UTC(2027, 0, 1, 0, 0);
const SLOT_SPACING_MINUTES = 120;
const SLOTS_PER_WORKER = 1000;

function hash(value: string): number {
  // FNV-1a（32bit）。テスト名から安定した数値を得るためだけに使う。
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** `datetime-local` 入力欄に入れる形式（`YYYY-MM-DDTHH:mm`）に変換する。 */
export function toDatetimeLocal(d: Date): string {
  return d.toISOString().slice(0, 16);
}

/** このテストに割り当てられた 1 時間の枠を返す。 */
export function slotFor(testInfo: TestInfo): { start: Date; end: Date } {
  const slotInBlock = hash(testInfo.titlePath.join("|")) % SLOTS_PER_WORKER;
  const offsetMinutes =
    testInfo.parallelIndex * SLOTS_PER_WORKER * SLOT_SPACING_MINUTES +
    slotInBlock * SLOT_SPACING_MINUTES;

  const start = new Date(SLOT_BASE_UTC + offsetMinutes * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  return { start, end };
}

/**
 * このテストが使う利用目的。
 *
 * 後片付けが「自分が作った予約だけ」を狙えるよう、テストごとに一意にする。
 * 並列実行中に他のテストの予約を巻き込まないための要。
 * 利用目的の桁数上限（255）に収まるよう切り詰める。
 */
export function purposeFor(testInfo: TestInfo): string {
  return `${E2E_PURPOSE_PREFIX} ${testInfo.titlePath.join(" > ")}`.slice(0, 255);
}

function idTokenFor(role: string): string {
  const statePath = path.join(AUTH_DIR, `${role}.json`);
  const state = JSON.parse(fs.readFileSync(statePath, "utf-8")) as {
    cookies: { name: string; value: string }[];
  };
  const cookie = state.cookies.find((c) => c.name === "dev-id-token");
  if (!cookie) {
    throw new Error(
      `${statePath} に dev-id-token がない。auth.setup.ts が先に走っているか確認する。`,
    );
  }
  return cookie.value;
}

/**
 * 予約をキャンセルして時間帯を解放する。
 *
 * `purpose` を渡すとその利用目的の予約だけを対象にする（テスト単位の後片付け）。
 * 省略すると印の付いた予約をすべて対象にする（実行開始前の取りこぼし回収）。
 *
 * `role` には、対象の予約を扱えるロールを渡す。MEMBER 以外のセッションで予約を
 * 作ったテストは、そのロールを渡さないと自分の予約を見つけられない。
 */
export async function cancelE2EReservations(
  options: { role?: string; purpose?: string } = {},
): Promise<number> {
  const role = options.role ?? "member";
  const api = await request.newContext({
    baseURL: BACKEND_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${idTokenFor(role)}` },
  });

  try {
    const res = await api.get("/api/reservations", { params: { size: "200" } });
    if (!res.ok()) {
      throw new Error(`予約一覧の取得に失敗した（${res.status()}）`);
    }
    const body = (await res.json()) as {
      content?: { id: string; purpose: string; status: string }[];
    };
    const rows = body.content ?? [];

    const targets = rows.filter(
      (r) =>
        OCCUPYING_STATUSES.includes(r.status) &&
        (options.purpose
          ? r.purpose === options.purpose
          : r.purpose?.startsWith(E2E_PURPOSE_PREFIX)),
    );

    for (const r of targets) {
      const cancelled = await api.post(`/api/reservations/${r.id}/cancel`);
      if (!cancelled.ok()) {
        throw new Error(`予約 ${r.id} のキャンセルに失敗した（${cancelled.status()}）`);
      }
    }
    return targets.length;
  } finally {
    await api.dispose();
  }
}
