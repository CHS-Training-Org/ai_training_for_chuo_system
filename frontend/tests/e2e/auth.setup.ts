import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * A1（サインインの方式）の本体。
 *
 * 開発専用ロール別ログイン（`src/server/actions/dev-auth.ts`）をブラウザから
 * 実行し、発行された cookie ごとセッションを保存する。保存先は
 * `frontend/playwright/.auth/<role>.json`。
 *
 * このファイルが確かめるのは A1 の 3 点のうち次の 2 点である。
 *   - ボタン押下で cookie の発行と画面遷移が成立するか
 *   - cookie の有効期限が実行時間に耐えるか（残り秒数をログと添付に出す）
 * 残る「保存したセッションを再利用できるか」は a1-signin.spec.ts が見る。
 *
 * 保存ファイルには cognito-local が発行した実物の IdToken が入る。
 * リポジトリに入れないよう .gitignore への追記が必要（runbook 参照）。
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

    // expires は epoch 秒。セッション cookie の場合は -1 になる。
    const remainingSec =
      devCookie!.expires > 0 ? Math.round(devCookie!.expires - Date.now() / 1000) : -1;
    console.log(
      `[A1][setup] ${role}: httpOnly=${devCookie!.httpOnly} sameSite=${devCookie!.sameSite} ` +
        `secure=${devCookie!.secure} path=${devCookie!.path} remainingSec=${remainingSec}`,
    );
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
