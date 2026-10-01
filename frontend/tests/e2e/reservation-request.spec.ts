import { test, expect } from "@playwright/test";
import {
  cancelE2EReservations,
  purposeFor,
  slotFor,
  toDatetimeLocal,
} from "./helpers/reservations";

/**
 * 疎通確認テスト（B7 で ci-frontend.yml に組み込む対象）。
 *
 * 予約申請画面のハッピーパスを role/label ロケータで実行できることを確かめる（A2）。
 * 日時は時計から作らず、テストごとに決まった枠を使う。作った予約は後片付けする（A3）。
 */

test.afterEach(async ({}, testInfo) => {
  // 自分が作った予約だけを対象にする。並列実行中の他のテストを巻き込まない。
  await cancelE2EReservations({ purpose: purposeFor(testInfo) });
});

test("予約を申請すると一覧画面に遷移する", async ({ page }, testInfo) => {
  const { start, end } = slotFor(testInfo);

  await page.goto("/reservations/new");

  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: /^プロジェクターA/ }).click();
  await page.getByLabel("開始日時 *").fill(toDatetimeLocal(start));
  await page.getByLabel("終了日時 *").fill(toDatetimeLocal(end));
  await page.getByLabel("利用目的 *").fill(purposeFor(testInfo));
  await page.getByRole("button", { name: "予約を申請する" }).click();

  await expect(page).toHaveURL(/\/reservations(\?.*)?$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "マイ予約", level: 1 })).toBeVisible();
});
