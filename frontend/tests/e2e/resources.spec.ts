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

  await expect(page).toHaveURL(/\/resources/);
});

test("リソース詳細を表示できる", async ({ page }) => {
  await page.goto("/auth/signin");

  await page
    .getByRole("button", {
      name: "一般社員（MEMBER）でログイン",
    })
    .click();

  await page
    .getByRole("link", {
      name: "リソース一覧",
    })
    .click();

  await expect(page).toHaveURL(/\/resources/);

  await page
    .getByRole("link", {
      name: /詳細を見る/,
    })
    .first()
    .click();

  await expect(page).toHaveURL(/\/resources\//);
});
