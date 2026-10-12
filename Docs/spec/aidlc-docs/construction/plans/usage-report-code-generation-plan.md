# Code Generation Plan — ユニット: usage-report（利用実績の集計・グラフ表示）

> この計画が Code Generation の唯一の正（single source of truth）。生成中はステップ順を変えず、完了したステップを直ちに [x] にする。

## Unit Context

- **Stories implemented**: US-01〜US-05（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（前提課題なし。DB・マイグレーションの変更なし。直前ユニットの CSV 帳票出力（PR #148）はマージ済みでこのブランチに取り込まれているが、本ユニットは機能として依存しない。`PERIOD_MATCH` は既存定数をそのまま使う）
- **Database entities owned**: なし（`reservations`・`resources` の読み取りのみ）
- **Service boundaries**: backend は `presentation/StatisticsController`・`application/StatisticsService`・`application/UsageCalculator`・`presentation/dto/UsageCondition`・`presentation/dto/ResourceUsageResponse`・`domain/ApprovedUsage` を新設し、`domain/ReservationRepository` にクエリを 2 つ追加する。frontend は `app/(authenticated)/admin/reports/` 配下のページ・フォーム・グラフ、`server/actions/statistics.ts`、`lib/datetime.ts` を新設し、`lib/types/api.ts`・`components/layout/nav-items.ts` を変更する。既存の `ReservationService`・`ResourceService`・予約一覧 API・`api-client.ts` には触れない

## 技術判断の参照先

Functional Design（`Docs/spec/aidlc-docs/construction/usage-report/functional-design/`）で確定済みの内容をそのまま実装する。本計画では再掲せず参照にとどめる。

- `business-logic-model.md`：全体フロー、各層の処理、エラー表
- `business-rules.md`：BR-01〜BR-19 と、ストーリー・テストの対応表
- `domain-entities.md`：新規クラスの署名、Repository の JPQL、追加位置の注意（`PERIOD_MATCH` の宣言より後）
- `frontend-components.md`：ページ・フォーム・グラフ・Server Action・ナビの仕様とテスト一覧

## 実行上の制約

- **テスト・ビルドは省メモリ・直列で実行する**（`./gradlew ... --max-workers=1`、`pnpm test` は `vitest.config.ts` の `maxForks: 1` に従う、`pnpm build` は `NODE_OPTIONS=--max-old-space-size=1536`）。複数のビルド・テストを並列に起動しない
- 新規ファイルのみ追加し、既存ファイルは in-place で最小変更する（`*_new` 等の複製を作らない）
- UI 要素には安定した `data-testid` を付ける（`frontend-components.md` に定めた値）
- 依存関係の追加なし（グラフライブラリは導入しない）。このため ADR は追加しない
- backend のテストの UUID プレフィックスは `73` を使う（`00`・`10`・`20`・`30`・`60`・`61`・`70`・`71` は使用済み。`72` はマージ済みの `ReportControllerTest`（CSV 帳票出力）が使っているため避ける）
- 実装を一時的に壊してテストが失敗することを確かめる確認（break-and-verify）を、backend と frontend の主要な規則で行い、確認後に必ず復元する

## 実行ステップ

- [x] **Step 1: 仕様書更新（Spec-first、実装より先）**
  - `/update-spec` の手順に従い、`.claude/skills/update-spec/references/spec-conventions.md` を読んでから更新する
  - `docs-next/docs/spec/api-spec.md`：エンドポイント一覧に「統計」の表と `GET /api/statistics/resources` を追加し、§統計（新セクション、明示アンカー付き）に、クエリ（`from`・`to`）、期間重複と切り詰め、同時指定と `from < to` の検証、対象 `APPROVED` のみ、0 件のリソースの含め方、並び順、応答の項目、エラー（400・401・403）を記載
  - `docs-next/docs/spec/screen-spec.md`：画面一覧・画面遷移図・サイドナビ表に `/admin/reports`（利用実績）を追加し、§`/admin/reports` に UI 要素（期間入力、「集計する」「リセット」、棒グラフ 2 本、表、空の状態、エラー表示）とアクセス制御（ADMIN のみ）を記載。画面数の総数表記（frontmatter の description と `index.md` の記述など）を grep で洗い出して同期する
  - `docs-next/docs/spec/requirements.md`：UC-10 と `USG-01`〜`06`（§統計）、ユースケース一覧の件数表記、API 権限マトリクス（`GET /api/statistics/resources` は ADMIN のみ）、画面アクセス権限表（`/admin/reports` は ADMIN のみ）を追記
  - frontmatter の `last_updated` を更新する。`cd docs-next && NODE_OPTIONS=--max-old-space-size=2048 npm run build` でリンク・アンカーを確認する
  - Story mapping: US-01, US-02, US-03, US-04, US-05

- [x] **Step 2: Backend `UsageCalculator` とそのユニットテスト**
  - 新規：`backend/src/main/java/com/example/bookflow/application/UsageCalculator.java`（`clippedSeconds`、BR-07）
  - 新規：`backend/src/test/java/com/example/bookflow/application/UsageCalculatorTest.java`（期間なし、期間が予約を完全に含む、前をまたぐ、後ろをまたぐ、両側をまたぐ、境界ちょうど、`from >= to` の負の防御）
  - Story mapping: US-02

- [x] **Step 3: Backend 射影・条件・応答・Repository・Service とそのユニットテスト**
  - 新規：`domain/ApprovedUsage.java`、`presentation/dto/UsageCondition.java`、`presentation/dto/ResourceUsageResponse.java`
  - 変更：`domain/ReservationRepository.java`（`findApprovedUsage`・`findApprovedUsageByPeriod` を、`PERIOD_MATCH` の宣言より後ろ（`findAllForReportBy*` がある場合はその後ろ）に追加、BR-04・BR-05・BR-11）
  - 新規：`application/StatisticsService.java`（`aggregate`、BR-04〜BR-10）
  - 新規：`backend/src/test/java/com/example/bookflow/application/StatisticsServiceTest.java`（Mockito。Repository を `APPROVED` で呼ぶ、期間あり・なしのクエリ切替、リソース別の合算と秒を最後に分へ切り捨て、有効で実績なしは 0・0、無効で実績ありは表示、無効で実績なしは非表示、並び順 3 段）
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 4: Backend `StatisticsController` と結合テスト**
  - 新規：`presentation/StatisticsController.java`（`@PreAuthorize("hasRole('ADMIN')")`、`from`/`to` の検証 2 種、BR-01〜BR-03）
  - 新規：`backend/src/test/java/com/example/bookflow/presentation/StatisticsControllerTest.java`（`BaseControllerTest`・H2・`@WithMockAdmin` 等。UUID の先頭は `73`。固定 UUID の seed と users 行の投入、ADMIN の 200・配列・4 項目、MEMBER・APPROVER の 403、未認証の 401、`from` のみ・`to` のみ・`from >= to`・同値の 400、PENDING・REJECTED・CANCELLED・DRAFT の除外と未来の承認済みの算入、期間重複と境界隣接、22:00〜02:00 の予約を 0:00 起点の期間で 120 分、期間なしは全時間、有効で実績なし・無効で実績あり・無効で実績なし、並び順、LAZY エラーがないこと）。年は 2030 など遠い将来にして、他のテストの seed と期間が重ならないようにし、リソース名は固有にして行を ID と名前で特定する
  - OpenAPI への反映：`GET /v3/api-docs` に `/api/statistics/resources` が載ることを、テスト環境で取得できれば同じテストクラスで検証する（取得できない設定のときは Build and Test の手動確認に回し、その理由を記録する）
  - Story mapping: US-01, US-02, US-03, US-04, US-05

- [x] **Step 5: Backend 検証とサマリ**
  - `cd backend && ./gradlew spotlessApply checkstyleMain test --max-workers=1` が成功することを確認する
  - break-and-verify：`@PreAuthorize` の削除、`status` を `APPROVED` 以外にする、切り詰めを外す、無効リソースの選別を外す、のうち主要なものを壊して該当テストが失敗することを確認し、復元する
  - 変更点を `Docs/spec/aidlc-docs/construction/usage-report/code/backend-summary.md` に記録する

- [x] **Step 6: Frontend 共通ユーティリティ・型・Server Action とテスト**
  - 新規：`frontend/src/lib/datetime.ts`（`toIsoWithSeconds`）、`frontend/tests/unit/datetime.test.ts`
  - 変更：`frontend/src/lib/types/api.ts`（`ResourceUsageResponseSchema` と型を追加）
  - 新規：`frontend/src/server/actions/statistics.ts`（`getResourceUsageAction`、BR-18）、`frontend/tests/unit/server/actions/statistics.test.ts`（MSW でテストごとにスタブ。`msw/handlers.ts` は変更しない）
  - Story mapping: US-02

- [x] **Step 7: Frontend 整形・棒グラフ・期間フィルタとテスト**
  - 新規：`frontend/src/app/(authenticated)/admin/reports/usage-format.ts`（`formatHours`・`barPercent`、BR-14・BR-15）、`tests/unit/usage-format.test.ts`
  - 新規：`.../admin/reports/UsageBarChart.tsx`（BR-15）、`tests/unit/usage-bar-chart.test.tsx`
  - 新規：`.../admin/reports/UsageFilterForm.tsx`（BR-13）、`tests/unit/usage-filter-form.test.tsx`
  - Story mapping: US-01, US-02

- [x] **Step 8: Frontend ページ組み込み・ナビとテスト**
  - 新規：`.../admin/reports/page.tsx`（BR-12・BR-13・BR-16・BR-17）、`tests/unit/admin-reports-page.test.tsx`（Server Action をモック。表の行と並び・時間の整形・空の状態・`VALIDATION_ERROR` のインライン表示・それ以外の再 throw）
  - 変更：`frontend/src/components/layout/nav-items.ts`（`ADMIN_ITEMS` に「利用実績」を追加、BR-19）、`frontend/tests/unit/layout/nav-items.test.ts`（`adminHrefs` に `/admin/reports` を追加し、MEMBER・APPROVER に出ないことを検証）
  - Story mapping: US-01, US-02, US-05

- [x] **Step 9: Frontend 検証とサマリ**
  - `cd frontend && pnpm lint && pnpm format:check && pnpm test && NODE_OPTIONS=--max-old-space-size=1536 pnpm build` がすべて成功することを確認する（`pnpm format` で整形が必要なら適用）
  - break-and-verify：棒の幅の計算、`from >= to` の検証、`VALIDATION_ERROR` の捕捉、ナビ項目の追加、のうち主要なものを壊して該当テストが失敗することを確認し、復元する
  - 変更点を `Docs/spec/aidlc-docs/construction/usage-report/code/frontend-summary.md` に記録する

- [x] **Step 10: ストーリー対応の最終確認**
  - US-01〜US-05 の各 Scenario が、いずれかのテストで検証されていることを対応表（`business-rules.md`）と照合する。足りないテストは追加する
  - 重複ファイル（`*_new`・`*_modified` 等）がないこと、`git status` の差分が計画に列挙したファイルに収まることを確認する

## ストーリー進捗

- [x] US-01 リソース別の利用実績の表示（Step 1・3・4・7・8）
- [x] US-02 期間を指定した集計（Step 1・2・3・4・6・7・8）
- [x] US-03 承認済みのみの集計（Step 1・3・4）
- [x] US-04 実績 0 件のリソースの表示（Step 1・3・4）
- [x] US-05 権限のないロールの拒否（Step 1・4・8）

## 変更ファイル一覧（予定）

- **Created（backend）**: `UsageCalculator.java`、`StatisticsService.java`、`StatisticsController.java`、`ApprovedUsage.java`、`UsageCondition.java`、`ResourceUsageResponse.java`、`UsageCalculatorTest.java`、`StatisticsServiceTest.java`、`StatisticsControllerTest.java`
- **Modified（backend）**: `ReservationRepository.java`
- **Created（frontend）**: `admin-layout.test.tsx`（Code Generation で追加。BR-12 の検証のため）、 `lib/datetime.ts`、`server/actions/statistics.ts`、`admin/reports/page.tsx`・`UsageFilterForm.tsx`・`UsageBarChart.tsx`・`usage-format.ts`、`datetime.test.ts`、`statistics.test.ts`、`usage-format.test.ts`、`usage-bar-chart.test.tsx`、`usage-filter-form.test.tsx`、`admin-reports-page.test.tsx`
- **Modified（frontend）**: `lib/types/api.ts`、`components/layout/nav-items.ts`、`tests/unit/layout/nav-items.test.ts`（`msw/handlers.ts` は変更しない）
- **Modified（docs）**: `api-spec.md`、`screen-spec.md`、`requirements.md`（spec。件数表記の同期で `index.md` などに及ぶ場合は追記）
- **Created（AI-DLC 文書）**: `construction/usage-report/code/backend-summary.md`、`frontend-summary.md`
