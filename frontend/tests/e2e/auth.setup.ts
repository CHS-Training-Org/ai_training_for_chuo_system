import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * ロールごとのサインイン済みの状態を用意する（setup プロジェクト）。
 *
 * 開発専用ロール別ログイン（`src/server/actions/dev-auth.ts`）をブラウザから
 * 実行し、発行された cookie ごとセッションを保存する。保存先は
 * `frontend/playwright/.auth/<role>.json`。ほかのテストはこのセッションを使う。
 * サインインの方式を決めたときの検証（A1）の経緯は、Playwright 導入計画の「決定1」にある。
 *
 * 保存ファイルには cognito-local が発行した実物の IdToken が入るため、
 * `frontend/playwright/.auth/` は .gitignore で除外している。
 */

const ROLES = [
  { role: "MEMBER", button: "一般社員（MEMBER）でログイン", badge: "一般社員" },
  { role: "APPROVER", button: "承認者（APPROVER）でログイン", badge: "承認者" },
  { role: "ADMIN", button: "管理者（ADMIN）でログイン", badge: "管理者" },
] as const;

const AUTH_DIR = path.join(__dirname, "..", "..", "playwright", ".auth");

for (const { role, button, badge } of ROLES) {
  setup(`${role} で開発用ログインしてセッションを保存する`, async ({ page }, testInfo) => {
    await page.goto("/auth/signin");
    await page.getByRole("button", { name: button }).click();

    // 成功すると Server Action が cookie を発行して / へリダイレクトする。
    // ここでサインイン画面に留まる場合、cookie は出ているがバックエンドの
    // 利用者情報 API に到達できず、レイアウトが戻している可能性が高い。
    await expect(page.getByRole("heading", { name: "ダッシュボード", level: 1 })).toBeVisible({
      timeout: 15_000,
    });

    // どのロールで入ったかをヘッダーのバッジで確認する
    await expect(page.locator("header").getByText(badge)).toBeVisible();

    const devCookie = (await page.context().cookies()).find((c) => c.name === "dev-id-token");
    expect(devCookie, "dev-id-token cookie が発行されていない").toBeDefined();
    expect(devCookie!.httpOnly, "dev-id-token が httpOnly ではない").toBe(true);

    // expires は epoch 秒。セッション cookie の場合は -1 になる。有効期限が切れて落ちたときの手がかりに、添付に残す
    const remainingSec =
      devCookie!.expires > 0 ? Math.round(devCookie!.expires - Date.now() / 1000) : -1;
    await testInfo.attach(`${role}-dev-cookie`, {
      body: JSON.stringify({ ...devCookie, value: "<redacted>", remainingSec }, null, 2),
      contentType: "application/json",
    });

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const statePath = path.join(AUTH_DIR, `${role.toLowerCase()}.json`);
    await page.context().storageState({ path: statePath });

    // 保存されたファイルに cookie が入っているかをその場で確かめる。
    // httpOnly cookie が落ちていると、再利用時に無言でサインイン画面へ戻る。
    const saved = JSON.parse(fs.readFileSync(statePath, "utf-8")) as {
      cookies: { name: string }[];
    };
    expect(
      saved.cookies.some((c) => c.name === "dev-id-token"),
      "storageState に dev-id-token が保存されていない",
    ).toBe(true);
  });
}
