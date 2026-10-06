import { chromium } from "@playwright/test";
import { AUTH_STATE } from "./auth-state";

/**
 * ロール別の認証状態（storageState）を事前生成する global setup。
 *
 * 開発用ロールログイン（`/auth/signin` の「○○でログイン」ボタン）を実際に
 * ブラウザで操作してサインインし、結果の cookie を `auth-state.ts`（`AUTH_STATE`）
 * が指すパスに保存する。各テストファイルは `test.use({ storageState })` でこれを
 * 読み込み、毎回サインインをやり直さずに済む。
 *
 * TEST-01 相当のサインイン自体の検証は `auth.spec.ts` で別途行うため、
 * ここで生成する認証状態は TEST-02〜04 の前提条件としてのみ使う。
 */
const ROLE_LOGIN_BUTTON_LABEL: Record<keyof typeof AUTH_STATE, string> = {
  member: "一般社員（MEMBER）でログイン",
  approver: "承認者（APPROVER）でログイン",
};

export default async function globalSetup(): Promise<void> {
  // playwright.config.ts の use.baseURL と同じロジックで決定する（config 経由の間接参照を避ける）。
  const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
  const browser = await chromium.launch();

  try {
    for (const [role, buttonLabel] of Object.entries(ROLE_LOGIN_BUTTON_LABEL) as [
      keyof typeof AUTH_STATE,
      string,
    ][]) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();

      // Turbopack の初回コンパイルで遅延する可能性があるため、余裕を持たせる。
      await page.goto("/auth/signin", { timeout: 60_000 });
      await page.getByRole("button", { name: buttonLabel }).click();
      await page.waitForURL("/", { timeout: 60_000 });
      await page.getByRole("heading", { name: "ダッシュボード" }).waitFor({ timeout: 60_000 });

      await context.storageState({ path: AUTH_STATE[role] });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
