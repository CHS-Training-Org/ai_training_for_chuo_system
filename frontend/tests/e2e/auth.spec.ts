import { test, expect } from "@playwright/test";

test("一般社員でログインできる", async ({ page }) => {
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

  await page.getByRole("button", { name: "サインアウト" }).click();

  await expect(page).toHaveURL(/\/auth\/signin/);

  await expect(
    page.getByRole("button", {
      name: "一般社員（MEMBER）でログイン",
    }),
  ).toBeVisible();
});
