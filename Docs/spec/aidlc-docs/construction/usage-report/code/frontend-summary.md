# Frontend Summary — usage-report

ADMIN 向けの統計ページ `/admin/reports`（リソース別の棒グラフ 2 本と表、期間フィルタ）と、サイドナビの「利用実績」を実装した。設計は `functional-design/` を参照。依存関係の追加はない（自前の棒グラフ）。

## 変更ファイル

- Created: `frontend/src/app/(authenticated)/admin/reports/page.tsx`（Server Component。Server Action 呼び出し、`VALIDATION_ERROR` のみ捕捉してインライン表示、それ以外は再 throw、棒グラフ 2 本と表、空の状態）
- Created: `.../admin/reports/UsageFilterForm.tsx`（Client。期間入力と、片方のみ・`from >= to` の検証、「集計する」「リセット」）
- Created: `.../admin/reports/UsageBarChart.tsx`（Server。自前の横棒グラフ。最大値を 100% とした相対値、棒は `aria-hidden`、値は数値で併記）
- Created: `.../admin/reports/usage-format.ts`（`formatHours`・`barPercent`）
- Created: `frontend/src/server/actions/statistics.ts`（`getResourceUsageAction`）、`frontend/src/lib/datetime.ts`（`toIsoWithSeconds` の共通化。既存 2 か所の複製は変更していない）
- Modified: `frontend/src/lib/types/api.ts`（`ResourceUsageResponseSchema` の追加）、`frontend/src/components/layout/nav-items.ts`（`ADMIN_ITEMS` に「利用実績」）
- Created（テスト）: `datetime.test.ts`（3 件）、`server/actions/statistics.test.ts`（7 件）、`usage-format.test.ts`（11 件）、`usage-bar-chart.test.tsx`（5 件）、`usage-filter-form.test.tsx`（9 件）、`admin-reports-page.test.tsx`（12 件）、`admin-layout.test.tsx`（4 件）
- Modified（テスト）: `layout/nav-items.test.ts`（`adminHrefs` に `/admin/reports` を追加し、末尾表示と MEMBER・APPROVER への非表示の 2 件を追加）

## 検証

- `pnpm lint`・`pnpm format:check`・`pnpm test`・`NODE_OPTIONS=--max-old-space-size=1536 pnpm build` がすべて成功。テストは 233 件すべて成功（既存 180 件 + 新規 53 件）。`/admin/reports` は動的ルート（ƒ）として登録された
- break-and-verify（実装を一時的に壊して失敗を確認後に復元、7 種類）：
  - `barPercent` を相対値でなくす → 棒の幅のテスト 4 件が失敗
  - `formatHours` の換算を `/60` にする → 整形のテストとページの表・グラフのテストが失敗
  - フォームの `from >= to` の検証を外す → 2 件が失敗
  - ページの `VALIDATION_ERROR` の捕捉を外す → 1 件が失敗
  - ナビ項目を削除 → 2 件が失敗
  - 秒補完を外す → Server Action と `datetime` の 3 件が失敗
  - `admin/layout.tsx` のガードを常に通す → MEMBER・APPROVER の 403 画面のテスト 2 件が失敗

## ストーリー対応

- US-01：表・棒グラフ・並び・時間の整形・空の状態（`admin-reports-page.test.tsx`、`usage-format.test.ts`、`usage-bar-chart.test.tsx`）
- US-02：期間の引き渡し・検証・リセット・URL 直打ちの 400 の表示（`usage-filter-form.test.tsx`、`admin-reports-page.test.tsx`、`statistics.test.ts`、`datetime.test.ts`）
- US-04：実績 0 件のリソースの表示（`admin-reports-page.test.tsx`）
- US-05：ナビの出し分け（`nav-items.test.ts`）、非 ADMIN の 403 画面（`admin-layout.test.tsx`）

## 設計との差異

- **`admin-layout.test.tsx` を追加した（計画外）**：`business-rules.md` の BR-12 に「`admin/layout.tsx` の 403 画面は既存テストで確認済み」と書いたが、確認すると既存のテストはなかった。US-05 の「非 ADMIN が `/admin/reports` を開くと 403 画面」を実際に検証するため、既存の `admin/layout.tsx`（変更なし）に対するテストを追加し、`business-rules.md` の記述を訂正した
- `tests/unit/msw/handlers.ts` は設計どおり変更していない（テストごとの `server.use` でスタブ）
- ナビ項目の追加と `nav-items.test.ts` の更新は、計画では Step 8 だったが、Step 6 の確認時に同時に行った（内容は計画どおり）
