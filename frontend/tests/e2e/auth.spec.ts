import { test, expect } from "@playwright/test";

/**
 * TEST-01: MEMBER ロールでのサインイン・サインアウト。
 *
 * `storageState` を使わず、各テストが自前でサインインする（認証状態そのものの検証のため）。
 * サインアウトは、開発用ロールログインが専用 cookie（`dev-id-token`）を使い、
 * 通常の「サインアウト」ボタン（Better Auth のセッションのみ解除）ではこの cookie が
 * 消えないという既知の制約があるため、ブラウザの cookie を直接削除して検証する
 * （requirements.md の決定どおり、アプリケーションコードは変更しない）。
 */

test.describe("認証", () => {
  test("MEMBER としてサインインし、ダッシュボードが表示される", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("button", { name: "一般社員（MEMBER）でログイン" }).click();

    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
    await expect(page.getByText("一般社員")).toBeVisible();
  });

  test("サインアウト（cookie 削除）後は保護ページにアクセスするとサインイン画面へリダイレクトされる", async ({
    page,
    context,
  }) => {
    await page.goto("/auth/signin");
    await page.getByRole("button", { name: "一般社員（MEMBER）でログイン" }).click();
    await page.waitForURL("/");

    // 開発用ロールログインの dev-id-token cookie を削除する（サインアウト相当）。
    await context.clearCookies();

    await page.goto("/resources");
    await page.waitForURL("/auth/signin");
    await expect(page.getByText("BookFlow", { exact: true })).toBeVisible();
  });
});
