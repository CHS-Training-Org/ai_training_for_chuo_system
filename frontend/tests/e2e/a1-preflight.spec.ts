import { test, expect } from "@playwright/test";

/**
 * A1 の前提確認。
 *
 * 開発用ログインが失敗したとき、原因が「ログインの仕組み」なのか
 * 「環境が起動していない」のかを切り分けられるようにする。後者の場合、
 * 認証ガードのレイアウトがサインイン画面へ戻すため、症状が
 * 「ログインが成立しない」と見分けがつかなくなる。
 */

test("開発用ロール別ログインボタンが描画される", async ({ page }) => {
  await page.goto("/auth/signin");

  // このボタンは NODE_ENV !== 'production' のときだけ描画される。
  // 見えない場合は本番ビルドを見ている（webServer の command を確認する）。
  await expect(page.getByRole("button", { name: "一般社員（MEMBER）でログイン" })).toBeVisible();
  await expect(page.getByRole("button", { name: "承認者（APPROVER）でログイン" })).toBeVisible();
  await expect(page.getByRole("button", { name: "管理者（ADMIN）でログイン" })).toBeVisible();
});

test("バックエンドに到達できる", async ({ request }) => {
  // Next.js の rewrite（/api/backend/* → BACKEND_URL/*）経由で actuator を叩く。
  // 認可が要る構成なら 401 が返るが、到達性の確認としてはそれで足りる。
  // バックエンドが落ちている場合は rewrite 先への接続が失敗し 5xx になる。
  const res = await request.get("/api/backend/actuator/health");
  console.log(`[A1][preflight] backend health status=${res.status()}`);
  expect(
    res.status(),
    "バックエンドに到達できない。frontend コンテナで ./gradlew bootRun を起動する",
  ).toBeLessThan(500);
});
