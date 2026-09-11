import { test, expect } from "@playwright/test";

/**
 * A1 の残り 1 点。保存したセッションを再利用して、サインインを経由せずに
 * 認証済み画面へ入れるかを見る。storageState は playwright.a1.config.ts の
 * a1 プロジェクトが注入する（MEMBER）。
 *
 * これが通れば、チュートリアル本体では各テストがログイン操作を繰り返さずに
 * 済む。落ちる場合は、テストごとにログインを通す設計にするしかない。
 */

test("保存したセッションで、予約申請画面に直接入れる", async ({ page }) => {
  await page.goto("/reservations/new");

  // 認証が効いていない場合はサインイン画面へ飛ぶため、URL で判定する
  await expect(page).toHaveURL(/\/reservations\/new(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "予約申請", level: 1 })).toBeVisible();
});

test("再利用したセッションのロールがヘッダーに出る", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("header").getByText("一般社員")).toBeVisible();
});
