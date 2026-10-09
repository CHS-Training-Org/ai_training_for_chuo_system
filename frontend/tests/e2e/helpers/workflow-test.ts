import { execFileSync } from "node:child_process";
import path from "node:path";
import { test as base, expect } from "@playwright/test";
import { apiAs } from "./setup-data";

/**
 * 結合テストのワークフローで生成したテスト（tests/e2e/workflow/）が使う test。
 *
 * テストごとに、結合テスト専用のデータベース（bookflow_e2e）を初期データ（scripts/seed.sql）だけの
 * 状態に戻してから動かす。学習者は、テストが撮った画面（実行のエビデンス）を見て判断する。ほかのテストや
 * 過去の実行のデータが画面に写ると、「このテストの予約がないこと」のような判断ができなくなるためである。
 *
 * 戻したあと、バックエンドから見える MEMBER の予約が、戻したデータベースの予約と一致するかを確かめる。
 * バックエンドが開発用のデータベース（bookflow）につながっていると、戻した結果が画面に出ないうえ、
 * 開発用のデータベースにテストのデータが残るためである。開発用のデータベースが初期データとまったく
 * 同じ状態のときだけは見分けられない。
 *
 * 初期化はテストごとに動くので、test.beforeAll で作ったデータは最初のテストの前に消える。
 * 前提のデータは各テストの中で作る。
 *
 * 同じデータベースを使うので、ワークフローのテストは1本ずつ流す（playwright.config.ts）。
 */
const DB_SCRIPT = path.resolve(__dirname, "../../../../scripts/e2e-workflow/db.mjs");

/** データベースを初期データに戻し、戻したあとの予約の ID を返す。失敗したら db.mjs のエラーの文面ごと投げる。 */
function resetDatabase(): string[] {
  try {
    const out = execFileSync("node", [DB_SCRIPT, "reset", "--ids"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(out) as string[];
  } catch (e) {
    const stderr = (e as { stderr?: string }).stderr?.trim();
    throw new Error(
      `結合テスト用のデータベース（bookflow_e2e）を初期データに戻せない（db.mjs reset）：${stderr || String(e)}`,
    );
  }
}

type SeenReservation = { id: string; purpose?: string; createdAt?: string };

/**
 * バックエンドから見える MEMBER の予約が、初期化したデータベースの予約だけか。
 * 違えば、何が違ったか（見えた件数と、初期データにない予約）を文で返す。
 */
async function mismatch(seeded: Set<string>): Promise<string | null> {
  const api = await apiAs("member");
  try {
    const res = await api.get("/api/reservations", { params: { size: "200" } });
    if (!res.ok()) {
      throw new Error(
        `初期化のあとの確認で、予約一覧を取得できない（${res.status()}）：${await res.text()}`,
      );
    }
    const body = (await res.json()) as { content?: SeenReservation[] };
    const rows = body.content ?? [];
    if (rows.length === 0) return "MEMBER の予約が1件も見えない";
    const extra = rows.filter((r) => !seeded.has(r.id));
    if (extra.length === 0) return null;
    // 開発用のデータベースにつないでいると数百件になるので、先頭の3件だけ示す
    const list = extra
      .slice(0, 3)
      .map((r) => `${r.createdAt ?? ""} ${r.purpose ?? ""}`)
      .join(" / ");
    return `初期データにない予約が ${extra.length} 件見える（${list}${extra.length > 3 ? " ほか" : ""}）`;
  } finally {
    await api.dispose();
  }
}

export const test = base.extend<{ freshDatabase: void }>({
  freshDatabase: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright の fixture は、使う fixture がなくても分割代入で受ける
    async ({}, use) => {
      // 正しくつないでいても、確認が一度だけ合わなかったことがある（2026-10-03、原因は未特定）。
      // 一度だけ初期化し直してから判断し、それでも合わなければ、つなぎ先の取り違えとみなす。
      // 初期化し直したときは、何が見えたかを出力に残す（原因を調べる手がかりにする）
      const first = await mismatch(new Set(resetDatabase()));
      let last = first;
      if (first) {
        console.warn(`[freshDatabase] 初期化のあとの確認が合わないので、初期化し直す：${first}`);
        await new Promise((r) => setTimeout(r, 2000));
        last = await mismatch(new Set(resetDatabase()));
      }
      if (last) {
        throw new Error(
          "バックエンドが結合テスト用のデータベース（bookflow_e2e）につながっていない。" +
            "DB_URL=jdbc:postgresql://postgres:5432/bookflow_e2e ./gradlew bootRun で起動し直す" +
            `（1回目：${first}／2回目：${last}）`,
        );
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect };
