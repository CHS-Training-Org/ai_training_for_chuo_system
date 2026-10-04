import { defineConfig, devices } from "@playwright/test";

// 実行ごとの ID（helpers/reservations.ts の E2E_RUN_ID）。ワーカーは起動時にこの環境変数を受け継ぐ
process.env.E2E_RUN_ID ||= Date.now().toString(36);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // 前回の実行が残した予約を片付けてから本体を走らせる
      name: "pre-clean",
      testMatch: /cleanup\.setup\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /\.spec\.ts$/,
      dependencies: ["pre-clean"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/member.json",
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
