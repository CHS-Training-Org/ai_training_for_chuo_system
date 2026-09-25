import { test, expect } from "@playwright/test";

test("サインイン画面が表示される", async ({ page }) => {
  await page.goto("/auth/signin");

  await expect(
    page.getByRole("button", {
      name: "一般社員（MEMBER）でログイン",
    }),
  ).toBeVisible();
});
