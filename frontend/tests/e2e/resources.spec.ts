import { test, expect } from "@playwright/test";

test("リソース一覧を表示できる", async ({ page }) => {
  await page.goto("/auth/signin");

  await page
    .getByRole("button", {
      name: "一般社員（MEMBER）でログイン",
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "ダッシュボード",
    }),
  ).toBeVisible();

  await page
    .getByRole("link", {
      name: "リソース一覧",
    })
    .click();

  // URL遷移を待つ
  await expect(page).toHaveURL(/\/resources/);

  // リソース一覧ページの表示確認
  await expect(
    page.getByRole("link", {
      name: "リソース一覧",
    }),
  ).toBeVisible();
});
