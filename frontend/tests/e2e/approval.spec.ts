import { test, expect, type Browser } from "@playwright/test";
import { AUTH_STATE } from "./auth-state";
import { toDateTimeLocal } from "./helpers";

/**
 * TEST-04: APPROVER ロールでの承認操作（承認・却下）。
 *
 * requirements.md の決定どおり、各テストが実行時に MEMBER ロールで
 * 「第1会議室（要承認）」への新規予約を申請して PENDING 項目を自己生成し、
 * 固定シードデータ（scripts/seed.sql）には依存しない（何度でも再実行可能にするため）。
 * 一意な `purpose` 文字列で、生成した申請を承認待ち一覧から識別する。
 */

/** MEMBER として「第1会議室（要承認）」への新規予約を申請し、一意な purpose を返す。 */
async function createPendingReservation(browser: Browser, label: string): Promise<string> {
  const purpose = `E2E承認テスト-${label}-${Date.now()}`;
  const context = await browser.newContext({ storageState: AUTH_STATE.member });
  const page = await context.newPage();

  await page.goto("/reservations/new");
  await page.getByRole("combobox", { name: "リソース *" }).click();
  await page.getByRole("option", { name: "第1会議室（要承認）" }).click();

  // 十分広い範囲でばらつかせ、何度も再実行しても同一スロットに衝突しないようにする。
  const start = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 800 + Math.random() * 1000 * 60 * 60 * 24 * 365,
  );
  const end = new Date(start.getTime() + 1000 * 60 * 60 * 2);
  await page.getByLabel("開始日時 *").fill(toDateTimeLocal(start));
  await page.getByLabel("終了日時 *").fill(toDateTimeLocal(end));
  await page.getByLabel("利用目的 *").fill(purpose);

  await page.getByRole("button", { name: "予約を申請する" }).click();
  await page.waitForURL("/reservations");

  await context.close();
  return purpose;
}

test.describe("承認操作", () => {
  test("APPROVER が承認待ちの申請を承認できる", async ({ browser }) => {
    const purpose = await createPendingReservation(browser, "approve");

    const context = await browser.newContext({ storageState: AUTH_STATE.approver });
    const page = await context.newPage();
    await page.goto("/approvals");

    const row = page.getByRole("row", { name: new RegExp(purpose) });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "承認", exact: true }).click();

    await page.getByRole("button", { name: "承認する", exact: true }).click();
    await expect(page.getByText("承認しました。")).toBeVisible();
    await expect(row).not.toBeVisible();

    await context.close();
  });

  test("APPROVER が承認待ちの申請を却下できる（却下理由入力）", async ({ browser }) => {
    const purpose = await createPendingReservation(browser, "reject");

    const context = await browser.newContext({ storageState: AUTH_STATE.approver });
    const page = await context.newPage();
    await page.goto("/approvals");

    const row = page.getByRole("row", { name: new RegExp(purpose) });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "却下", exact: true }).click();

    await page.getByPlaceholder("却下理由を入力してください（必須）").fill("E2Eテストによる却下");
    await page.getByRole("button", { name: "却下する", exact: true }).click();

    await expect(page.getByText("却下しました。")).toBeVisible();
    await expect(row).not.toBeVisible();

    await context.close();
  });
});
