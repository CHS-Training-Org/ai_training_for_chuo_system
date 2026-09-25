import { test, expect } from "@playwright/test";

test("承認者が承認待ちの予約を承認できる", async ({ page }) => {
  const purpose = `Playwright承認テスト-${Date.now()}`;

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

  // 一般社員で承認待ち予約を作成
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

  await page.getByLabel("開始日時 *").fill(toDateTimeLocal(start));

  await page.getByLabel("終了日時 *").fill(toDateTimeLocal(end));

  await page.getByLabel("利用目的 *").fill(purpose);

  await page.getByLabel("参加人数").fill("5");

  await page
    .getByRole("button", {
      name: "予約を申請する",
    })
    .click();

  await page.waitForTimeout(2000);

  await expect(page).toHaveURL(/\/reservations$/);

  const memberReservationRow = page.getByRole("row").filter({ hasText: purpose });

  await expect(memberReservationRow).toBeVisible();
  await expect(memberReservationRow).toContainText("承認待ち");

  // サインアウト
  await page
    .getByRole("button", {
      name: "サインアウト",
    })
    .click();

  await expect(page).toHaveURL(/\/auth\/signin/);

  // 承認者でログイン
  await page
    .getByRole("button", {
      name: "承認者（APPROVER）でログイン",
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "ダッシュボード",
    }),
  ).toBeVisible();

  // 承認待ち一覧へ移動
  await page
    .getByRole("link", {
      name: /承認/,
    })
    .click();

  // 今回作成した予約の行を特定
  const approvalRow = page.getByRole("row").filter({ hasText: purpose });

  await expect(approvalRow).toBeVisible();

  const approveButton = approvalRow.getByRole("button", {
    name: "承認",
    exact: true,
  });

  await expect(approveButton).toBeVisible();
  await approveButton.click();

  // 確認ダイアログが表示される場合に対応
  const confirmButton = page.getByRole("button", {
    name: /承認する|確定/,
  });

  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }

  // 承認後、承認待ち一覧から対象予約が消えることを確認
  await expect(page.getByRole("row").filter({ hasText: purpose })).not.toBeVisible();
});

test("承認者が承認待ちの予約を却下できる", async ({ page }) => {
  const purpose = `Playwright却下テスト-${Date.now()}`;

  const now = new Date();

  const start = new Date(now);
  start.setDate(start.getDate() + 60 + (now.getMinutes() % 20));
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

  // 一般社員で承認待ち予約を作成
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

  await page.getByLabel("開始日時 *").fill(toDateTimeLocal(start));

  await page.getByLabel("終了日時 *").fill(toDateTimeLocal(end));

  await page.getByLabel("利用目的 *").fill(purpose);

  await page.getByLabel("参加人数").fill("5");

  await page
    .getByRole("button", {
      name: "予約を申請する",
    })
    .click();

  await page.waitForTimeout(2000);

  await expect(page).toHaveURL(/\/reservations$/);

  const memberReservationRow = page.getByRole("row").filter({ hasText: purpose });

  await expect(memberReservationRow).toBeVisible();
  await expect(memberReservationRow).toContainText("承認待ち");

  // サインアウト
  await page
    .getByRole("button", {
      name: "サインアウト",
    })
    .click();

  // サインアウト後
  await expect(page).toHaveURL(/\/auth\/signin/);

  // 承認者でログイン
  await page
    .getByRole("button", {
      name: "承認者（APPROVER）でログイン",
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "ダッシュボード",
    }),
  ).toBeVisible();

  // 承認待ち一覧へ移動
  await page
    .getByRole("link", {
      name: /承認/,
    })
    .click();

  // 今回作成した予約の行を特定
  const approvalRow = page.getByRole("row").filter({ hasText: purpose });

  await expect(approvalRow).toBeVisible();

  const rejectButton = approvalRow.getByRole("button", {
    name: "却下",
    exact: true,
  });

  await expect(rejectButton).toBeVisible();
  await rejectButton.click();

  // 却下後、承認待ち一覧から対象予約が消えることを確認
  const confirmButton = page.getByRole("button", {
    name: /却下する|確定/,
  });

  if (await confirmButton.isVisible().catch(() => false)) {
    await confirmButton.click();
  }

  // 承認後、承認待ち一覧から対象予約が消えることを確認
  await expect(page.getByRole("row").filter({ hasText: purpose })).not.toBeVisible();
});
