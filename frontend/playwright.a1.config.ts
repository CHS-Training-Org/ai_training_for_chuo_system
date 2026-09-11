import { defineConfig, devices } from "@playwright/test";

/**
 * A1（サインインの方式）の技術検証専用の Playwright 設定。
 *
 * 既存の `playwright.config.ts` には手を入れない（技術検証はチュートリアル本体に
 * 影響させない方針のため）。実行は次のとおり。
 *
 *   cd frontend
 *   pnpm exec playwright test -c playwright.a1.config.ts
 *
 * 3 つのプロジェクトを直列に実行する。
 *   preflight : フロントエンドとバックエンドに到達できるかを先に切り分ける
 *   setup     : 開発用ロール別ログインを実行し、storageState を保存する
 *   a1        : 保存した storageState を再利用して認証済み画面へ入れるかを見る
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // 検証では再試行させない。落ちた事実をそのまま見る。
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "preflight",
      testMatch: /a1-preflight\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      dependencies: ["preflight"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "a1",
      testMatch: /a1-signin\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        // setup が保存したセッションを注入する
        storageState: "playwright/.auth/member.json",
      },
    },
  ],
  webServer: {
    // 既存設定と同じ。devcontainer で `pnpm dev` が動いていればそれを再利用する。
    // 本番ビルドに変えると NODE_ENV が production になり、開発用ログインは遮断される。
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
