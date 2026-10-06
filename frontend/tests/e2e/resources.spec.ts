import { test, expect } from "@playwright/test";
import { AUTH_STATE } from "./auth-state";

/**
 * TEST-02: リソース一覧の閲覧・詳細確認（未サインインでのリダイレクト確認を含む）。
 */

test.describe("リソース一覧・詳細", () => {
  test.use({ storageState: AUTH_STATE.member });

  test("リソース一覧を表示し、1件のリソースの詳細画面に遷移できる", async ({ page }) => {
    await page.goto("/resources");
    await expect(page.getByRole("heading", { name: "リソース一覧" })).toBeVisible();

    const firstCardLink = page.getByRole("link", { name: "詳細を見る →" }).first();
    await expect(firstCardLink).toBeVisible();
    await firstCardLink.click();

    await page.waitForURL(/\/resources\/[0-9a-f-]+$/);
    await expect(page.getByRole("link", { name: "← リソース一覧に戻る" })).toBeVisible();
  });
});

test.describe("未サインイン", () => {
  // このブロックのみ storageState を使わず、未認証の新規コンテキストで検証する。
  test("未サインインでリソース一覧にアクセスするとサインイン画面へリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/resources");
    await page.waitForURL("/auth/signin");
    await expect(page.getByText("BookFlow", { exact: true })).toBeVisible();
  });
});
