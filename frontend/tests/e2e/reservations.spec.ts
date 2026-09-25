import { test, expect } from "@playwright/test";

test("予約申請画面を表示できる", async ({ page }) => {
  await page.goto("/auth/signin");

  await page
    .getByRole("button", {
      name: "一般社員（MEMBER）でログイン",
    })
    .click();

  // ログイン処理とセッション作成の完了を待つ
  await expect(
    page.getByRole("heading", {
      name: "ダッシュボード",
    }),
  ).toBeVisible();

  // 画面内のリンクから予約申請画面へ移動
  await page
    .getByRole("link", {
      name: "予約を申請する",
    })
    .click();

  await expect(page).toHaveURL(/\/reservations\/new/);

  await expect(
    page.getByRole("heading", {
      name: "予約申請",
    }),
  ).toBeVisible();

  await expect(page.getByLabel("リソース *")).toBeVisible();
  await expect(page.getByLabel("開始日時 *")).toBeVisible();
  await expect(page.getByLabel("終了日時 *")).toBeVisible();
  await expect(page.getByLabel("利用目的 *")).toBeVisible();
});
