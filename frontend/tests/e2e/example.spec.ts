import { test, expect } from "@playwright/test";

test("トップページが表示される", async ({ page }) => {
  // 未サインインのため "/" は /auth/signin へリダイレクトされる
  // （shadcn の CardTitle は <div> を描画するため、heading ロールではなくテキストで検証する）。
  await page.goto("/");
  await page.waitForURL("/auth/signin");
  await expect(page.getByText("BookFlow", { exact: true })).toBeVisible();
});
