import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    // メモリの少ない学習者端末でも安定して実行できるよう、並列ワーカーを1に固定する
    // （isolation は維持したまま thread 数のみ絞る。Playwright の workers:1 と同じ方針）。
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
