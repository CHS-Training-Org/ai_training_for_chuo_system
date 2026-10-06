import { chromium, type FullConfig } from "@playwright/test";

/**
 * ロール別の認証状態（storageState）を事前生成する global setup。
 *
 * 開発用ロールログイン（`/auth/signin` の「○○でログイン」ボタン）を実際に
 * ブラウザで操作してサインインし、結果の cookie を `tests/e2e/.auth/{role}.json`
 * に保存する。各テストファイルは `test.use({ storageState })` でこれを読み込み、
 * 毎回サインインをやり直さずに済む。
 *
 * TEST-01 相当のサインイン自体の検証は `auth.spec.ts` で別途行うため、
 * ここで生成する認証状態は TEST-02〜04 の前提条件としてのみ使う。
 */
const ROLE_LOGIN_BUTTON_LABEL: Record<string, string> = {
  member: "一般社員（MEMBER）でログイン",
  approver: "承認者（APPROVER）でログイン",
};

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const browser = await chromium.launch();

  try {
    for (const [role, buttonLabel] of Object.entries(ROLE_LOGIN_BUTTON_LABEL)) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();

      // Turbopack の初回コンパイルで遅延する可能性があるため、余裕を持たせる。
      await page.goto("/auth/signin", { timeout: 60_000 });
      await page.getByRole("button", { name: buttonLabel }).click();
      await page.waitForURL("/", { timeout: 60_000 });
      await page.getByRole("heading", { name: "ダッシュボード" }).waitFor({ timeout: 60_000 });

      await context.storageState({ path: `tests/e2e/.auth/${role}.json` });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
