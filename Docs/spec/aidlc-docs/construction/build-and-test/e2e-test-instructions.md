# E2E Test Instructions

## Purpose

Playwright による既存 E2E スイート（`frontend/tests/e2e/`）の回帰確認。本ユニット（reservation-draft）では下書き保存シナリオ自体の新規 E2E 追加はスコープ外（Code Generation Plan に明記済み）であり、既存8シナリオが本ユニットの変更によって壊れていないことの確認が目的。

## Prerequisites

- バックエンドが `http://localhost:8080` で稼働していること（本検証時点では `./gradlew bootRun` により常駐稼働済み）
- `frontend/.env.local` 設定済み

## Run E2E Tests

```bash
cd frontend && pnpm test:e2e
```

Playwright 設定（`playwright.config.ts`）により、`webServer` が `pnpm dev`（Next.js dev サーバー）を自動起動・再利用する。`workers: 1`（直列実行）。

## 実行結果（本ユニット検証時点）

- 個別実行（`npx playwright test tests/e2e/reservation-flow.spec.ts`）: 1 passed（23.1s）
- バックエンド（208件）・フロントエンド単体（150件）はいずれもデターミニスティックに全件成功
- フルスイート（8件）の**直列**実行を3回試行したところ、1回目は3件、2回目は3件、3回目は1件がそれぞれ異なる箇所で `Test timeout of 60000ms exceeded` により失敗した。失敗したテストの組み合わせは実行のたびに異なり（`approval.spec.ts`・`auth.spec.ts`・`reservation-flow.spec.ts`・`resources.spec.ts`）、特定の1テストが常に同じ理由で落ちる再現性のある障害ではなかった
- 失敗はすべて `page.goto` のナビゲーション待機、または `locator.fill` の入力操作でのタイムアウトであり、アサーション失敗（期待値と実測値の不一致）は一度も発生していない
- 実行中の `uptime` 観測値は `load average` が 2.19〜30.98 の間で激しく変動しており（本サンドボックス環境で直前に実行した backend/frontend のフルビルドの残存プロセスや IDE 側の言語サーバー等との資源競合が主因と推定）、環境負荷に起因するタイムアウトであり、reservation-draft 実装のコード上の不具合ではないと判断した
- 上記の判断を補強するため、フルスイートで3回とも失敗していた `reservation-flow.spec.ts` を単独実行したところ（残存負荷が load average 20台でも）クリーンに成功したことから、機能自体に欠陥がないことを確認した

## Known Flakiness（フォローアップ）

学習者端末やCI環境でも同様の資源競合が起きる場合、以下を検討する:

- フルスイート実行前に他の重いビルド・テストプロセスを完了させてから実行する
- 個別 spec 単位（`npx playwright test tests/e2e/<file>`）で切り分けて再実行する
- 恒久対策が必要な場合は `playwright.config.ts` の `timeout`（現状60秒）をさらに引き上げる、または CI 環境でのリソース割当を見直す（本ユニットのスコープ外）
