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

test("予約対象のリソースを選択できる", async ({ page }) => {
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
      name: "予約を申請する",
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "予約申請",
    }),
  ).toBeVisible();

  // リソース選択
  await page.getByRole("combobox").click();

  await page
    .getByRole("option", {
      name: /第1会議室/,
    })
    .click();

  // 選択されたことを確認
  await expect(page.getByRole("combobox")).toContainText("第1会議室");
});

test("予約申請フォームへ入力できる", async ({ page }) => {
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
      name: "予約を申請する",
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "予約申請",
    }),
  ).toBeVisible();

  // リソース選択
  await page.getByRole("combobox").click();

  await page
    .getByRole("option", {
      name: /第1会議室/,
    })
    .click();

  // 利用目的入力
  await page.getByLabel("利用目的 *").fill("Playwright E2Eテスト");

  await expect(page.getByLabel("利用目的 *")).toHaveValue("Playwright E2Eテスト");
});

test("予約日時を入力できる", async ({ page }) => {
  await page.goto("/auth/signin");

  await page
    .getByRole("button", {
      name: "一般社員（MEMBER）でログイン",
    })
    .click();

  await page
    .getByRole("link", {
      name: "予約を申請する",
    })
    .click();

  // リソース選択
  await page.getByRole("combobox").click();

  await page
    .getByRole("option", {
      name: /第1会議室/,
    })
    .click();

  // 利用目的
  await page.getByLabel("利用目的 *").fill("Playwright E2Eテスト");

  // 参加人数
  await page.getByPlaceholder("例: 10").fill("5");
});

test("予約を申請できる", async ({ page }) => {
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
      name: "予約を申請する",
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "予約申請",
    }),
  ).toBeVisible();

  // リソース選択
  await page
    .getByRole("combobox", {
      name: "リソース *",
    })
    .click();

  await page
    .getByRole("option", {
      name: /第1会議室/,
    })
    .click();

  // テスト実行時刻から予約日時を生成
  const now = new Date();

  const start = new Date(now);
  start.setDate(start.getDate() + 30 + (now.getMinutes() % 20));
  start.setHours(9 + (now.getHours() % 6), now.getMinutes(), 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const toDateTimeLocal = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");

    return (
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}T` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}`
    );
  };

  const purpose = `Playwright予約テスト-${Date.now()}`;

  // 予約内容入力
  await page.getByLabel("開始日時 *").fill(toDateTimeLocal(start));

  await page.getByLabel("終了日時 *").fill(toDateTimeLocal(end));

  await page.getByLabel("利用目的 *").fill(purpose);

  await page.getByLabel("参加人数").fill("5");

  // 予約申請
  await page
    .getByRole("button", {
      name: "予約を申請する",
    })
    .click();

  // マイ予約画面への遷移を確認
  await expect(page).toHaveURL(/\/reservations$/);

  await expect(
    page.getByRole("heading", {
      name: "マイ予約",
    }),
  ).toBeVisible();

  // 申請内容が一覧に追加されたことを確認
  await expect(page.getByText(purpose)).toBeVisible();

  const reservationRow = page.getByRole("row").filter({ hasText: purpose });

  await expect(reservationRow).toContainText("第1会議室");
  await expect(reservationRow).toContainText("承認待ち");
});
