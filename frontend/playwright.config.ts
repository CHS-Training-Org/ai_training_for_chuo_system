import { defineConfig, devices } from "@playwright/test";

// 実行ごとの ID（helpers/reservations.ts の E2E_RUN_ID）。ワーカーは起動時にこの環境変数を受け継ぐ
process.env.E2E_RUN_ID ||= Date.now().toString(36);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 結合テストのワークフローのテストは、テストごとに同じ専用のデータベースを初期データに戻すため、1本ずつ流す。
  // 並列に流すと開発サーバーの応答が遅れ、画面の準備が整う前に入力した値が消えることもあった
  workers: process.env.CI || process.env.E2E_WORKFLOW ? 1 : undefined,
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
      // workflow/ は結合テストのワークフローで生成した学習者の成果物。普段の実行には含めない
      testIgnore: [/workflow\//],
      dependencies: ["pre-clean"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/member.json",
      },
    },
    // 結合テストのワークフローが生成したテスト（学習者の成果物）は、E2E_WORKFLOW=1 のときだけ動かす。
    // 普段の pnpm test:e2e には含めない。実行は pnpm test:e2e:workflow を使う
    ...(process.env.E2E_WORKFLOW
      ? [
          {
            name: "workflow",
            testMatch: /workflow\/.*\.spec\.ts$/,
            dependencies: ["pre-clean"],
            use: {
              ...devices["Desktop Chrome"],
              storageState: "playwright/.auth/member.json",
              // 学習者が実行の証拠として、確かめる場所の画面（helpers/evidence.ts）と並べて見る
              screenshot: "only-on-failure" as const,
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
