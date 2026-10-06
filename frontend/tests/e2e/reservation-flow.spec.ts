import { test, expect } from "@playwright/test";

/**
 * TEST-03: サインイン → リソース一覧閲覧 → 予約申請 を1本のテストシナリオとして実行する
 * （受入条件どおり、`storageState` を使わずテスト自身がサインインから行う）。
 *
 * 即時確定（`requiresApproval=false`）のリソースを選び、承認フローを介さず完結させる。
 */

test("サインインしてリソース一覧を閲覧し、予約を申請できる", async ({ page }) => {
  // 1. サインイン
  await page.goto("/auth/signin");
  await page.getByRole("button", { name: "一般社員（MEMBER）でログイン" }).click();
  await page.waitForURL("/");

  // 2. リソース一覧を閲覧
  await page.goto("/resources");
  await expect(page.getByRole("heading", { name: "リソース一覧" })).toBeVisible();

  // 3. 予約申請フォームへ遷移し、即時確定リソースへ申請する
  await page.goto("/reservations/new");
  await expect(page.getByRole("heading", { name: "予約申請" })).toBeVisible();

  const uniqueSuffix = Date.now();
  const purpose = `E2E予約申請テスト-${uniqueSuffix}`;

  // リソース選択は Radix UI の Select（ネイティブ select ではない）のため、
  // トリガーをクリックしてから選択肢をクリックする。
  await page.getByRole("combobox", { name: "リソース *" }).click();
  await page.getByRole("option", { name: "プロジェクターA（即時確定）" }).click();

  // 約2年後（シード・他テストと衝突しない範囲）+ 1年分のランダムな揺らぎ。
  // 固定・狭い範囲の日時だと、何度も再実行した際に同一スロットの予約が蓄積して
  // 重複予約エラーになるため、十分広い範囲でばらつかせる。
  const start = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 730 + Math.random() * 1000 * 60 * 60 * 24 * 365,
  );
  const end = new Date(start.getTime() + 1000 * 60 * 60 * 2);
  await page.getByLabel("開始日時 *").fill(toDateTimeLocal(start));
  await page.getByLabel("終了日時 *").fill(toDateTimeLocal(end));
  await page.getByLabel("利用目的 *").fill(purpose);

  await page.getByRole("button", { name: "予約を申請する" }).click();

  await page.waitForURL("/reservations");

  // マイ予約一覧は蓄積した件数によってはページングで新規分が1ページ目に
  // 表示されないことがあるため、期間で絞り込んでから確認する。
  await page.getByLabel("開始日時", { exact: true }).fill(toDateTimeLocal(start));
  await page.getByLabel("終了日時", { exact: true }).fill(toDateTimeLocal(end));
  await page.getByRole("button", { name: "絞り込む" }).click();

  await expect(page.getByText(purpose)).toBeVisible();
});

/** datetime-local input 用に `yyyy-MM-ddTHH:mm` 形式へ整形する。 */
function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
