# Code Generation Plan — ユニット: csv-report（CSV 帳票出力）

> この計画が Code Generation の唯一の正（single source of truth）。生成中はステップ順を変えず、完了したステップを直ちに [x] にする。

## Unit Context

- **Stories implemented**: US-01〜US-05（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（前提課題なし。DB・マイグレーションの変更なし）
- **Database entities owned**: なし（`reservations` の読み取りのみ）
- **Service boundaries**: backend は `presentation/ReportController`・`application/ReservationReportService`・`application/csv/CsvWriter`・`presentation/dto/ReportCondition` を新設し、`domain/ReservationRepository` にクエリを 2 つ追加する。frontend は `app/api/reports/reservations/csv/route.ts` と `app/(authenticated)/reservations/CsvDownloadButton.tsx` を新設し、`reservations/page.tsx` を 1 か所変更する。既存の `ReservationService`・予約一覧 API・`api-client.ts` には触れない

## 技術判断の参照先

Functional Design（`Docs/spec/aidlc-docs/construction/csv-report/functional-design/`）で確定済みの内容をそのまま実装する。本計画では再掲せず参照にとどめる。

- `business-logic-model.md`：全体フロー、各層の処理、エラー表
- `business-rules.md`：BR-01〜BR-15 と、ストーリー・テストの対応表
- `domain-entities.md`：新規クラスの署名、Repository の JPQL、追加位置の注意（`PERIOD_MATCH` の宣言より後）
- `frontend-components.md`：ボタン・ページ・Route Handler の仕様とテスト一覧

## 実行上の制約

- **テスト・ビルドは省メモリ・直列で実行する**（`./gradlew ... --max-workers=1`、`pnpm test` は `vitest.config.ts` の `maxForks: 1` に従う、`pnpm build` は `NODE_OPTIONS=--max-old-space-size=1536`）。複数のビルド・テストを並列に起動しない
- 新規ファイルのみ追加し、既存ファイルは in-place で最小変更する（`*_new` 等の複製を作らない）
- UI 要素には安定した `data-testid` を付ける（`reservations-csv-download`）
- 依存関係の追加なし（OpenCSV 等は導入しない）。このため ADR は追加しない

## 実行ステップ

- [x] **Step 1: 仕様書更新（Spec-first、実装より先）**
  - `/update-spec` の手順に従い、`docs-next/docs/spec/references/spec-conventions.md` 相当の表記規約を読んでから更新する
  - `docs-next/docs/spec/api-spec.md`：エンドポイント一覧表に `GET /api/reports/reservations/csv` を追加し、§帳票出力（新セクション、明示アンカー付き）に、クエリ（`status`・`from`・`to`）、期間重複と同時指定ルール、`status` 既定（DRAFT 除外）、列定義、BOM・CRLF・エスケープ・数式対策、応答ヘッダ、エラー（400・401・403）を記載
  - `docs-next/docs/spec/screen-spec.md` §`/reservations`：ADMIN のときだけ表示する「CSV ダウンロード」ボタン（引き継ぐ条件は `status`・`from`・`to`、`resourceName`・`page` は除く）を追記
  - `docs-next/docs/spec/requirements.md`：UC-07 と API 権限マトリクス（`GET /api/reports/reservations/csv` は ADMIN のみ）に反映。総数表記・画面アクセス権限表に影響があれば同期する
  - frontmatter の `last_updated` を更新する。`cd docs-next && npm run build` でリンク・アンカーを確認する
  - Story mapping: US-01, US-02, US-03, US-04, US-05

- [x] **Step 2: Backend `CsvWriter` とそのユニットテスト**
  - 新規：`backend/src/main/java/com/example/bookflow/application/csv/CsvWriter.java`（`toBytes`・`escape`、BR-08〜BR-10）
  - 新規：`backend/src/test/java/com/example/bookflow/application/csv/CsvWriterTest.java`（BR-08 のカンマ・二重引用符・CR・LF、BR-09 の `=` `+` `-` `@` タブ CR・通常文字列不変・無害化後の引用符、BR-10 の BOM・CRLF・最終行の CRLF、`null` セル）
  - Story mapping: US-02, US-05

- [x] **Step 3: Backend 条件・Repository・Service とそのユニットテスト**
  - 新規：`presentation/dto/ReportCondition.java`（record、`hasPeriod`）
  - 変更：`domain/ReservationRepository.java`（`PERIOD_MATCH` の宣言より後に `findAllForReportByStatusIn`・`findAllForReportByPeriodAndStatusIn` を追加、BR-03・BR-05・BR-15）
  - 新規：`application/ReservationReportService.java`（`exportCsv`、status 既定、行の整形、ラベル `switch` 式、BR-04・BR-06・BR-07・BR-12）
  - 新規：`backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java`（Mockito。status 未指定で DRAFT 以外 4 値を渡す、期間あり・なしで呼ぶクエリの切替、ラベル 5 値、日時書式、0 件でヘッダのみ）
  - Story mapping: US-02, US-03

- [x] **Step 4: Backend `ReportController` と結合テスト**
  - 新規：`presentation/ReportController.java`（`@PreAuthorize("hasRole('ADMIN')")`、`from`/`to` の同時指定チェック、ヘッダ付与、BR-01・BR-02・BR-11）
  - 新規：`backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java`（`BaseControllerTest`・H2・`@WithMockAdmin` 等。固定 UUID の seed と users 行の投入、ADMIN の 200・BOM・ヘッダ・本文、MEMBER・APPROVER の 403、未認証の 401、`from` のみ・`to` のみの 400、期間重複と境界隣接、`status` 既定で DRAFT 除外・`status=DRAFT`・不正値の 400、開始日時の昇順、LAZY エラーがないこと）。UUID の先頭プレフィックスは他テストと重ならない値にする
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 5: Backend 検証とサマリ**
  - `cd backend && ./gradlew spotlessApply checkstyleMain test --max-workers=1` が成功することを確認する
  - 変更点を `Docs/spec/aidlc-docs/construction/csv-report/code/backend-summary.md` に記録する

- [x] **Step 6: Frontend `CsvDownloadButton` とテスト**
  - 新規：`frontend/src/app/(authenticated)/reservations/CsvDownloadButton.tsx`（Server Component、`<a download>`、`data-testid="reservations-csv-download"`、BR-14）
  - 新規：`frontend/tests/unit/csv-download-button.test.tsx`（`status`（複数）・`from`・`to` の引き継ぎ、`resourceName`・`page` を含まない、値がないときクエリなし）
  - Story mapping: US-01

- [x] **Step 7: Frontend Route Handler とテスト**
  - 新規：`frontend/src/app/api/reports/reservations/csv/route.ts`（BR-13。`fetch` 直接呼び出し、`Accept: */*`、秒補完、透過、バイト列中継、`Cache-Control: no-store`、401・502）
  - 変更：なし。当初は `frontend/tests/unit/msw/handlers.ts` に CSV 用ハンドラを追加する予定だったが、Route Handler は `BACKEND_URL` の絶対 URL を呼ぶため共通ハンドラ（相対 `/api/backend/*`）に載せられず、テストごとの `server.use` でスタブする方式に変えた（`frontend-summary.md` 参照）
  - 新規：`frontend/tests/unit/reports-csv-route.test.ts`（トークンなしで 401、転送パラメータと秒補完、Authorization と `Accept`、非 2xx の透過、BOM を含むバイト列の保持、`fetch` 例外で 502）
  - Story mapping: US-01, US-04

- [x] **Step 8: Frontend ページ組み込みとテスト**
  - 変更：`frontend/src/app/(authenticated)/reservations/page.tsx`（`isAdmin` のときだけ、ヘッダ行の「リソースを探す」の隣に `CsvDownloadButton` を描画。ボタン以外の表示・取得ロジックは変更しない）
  - 変更：`frontend/tests/unit/reservations-page.test.tsx`（ADMIN でボタン表示・`href` に現在の絞り込み、MEMBER で非表示。`getProfileAction` のモックでロール切替）
  - Story mapping: US-01, US-04

- [x] **Step 9: Frontend 検証とサマリ**
  - `cd frontend && pnpm lint && pnpm format:check && pnpm test && NODE_OPTIONS=--max-old-space-size=1536 pnpm build` がすべて成功することを確認する（`pnpm format` で整形が必要なら適用）
  - 変更点を `Docs/spec/aidlc-docs/construction/csv-report/code/frontend-summary.md` に記録する

- [x] **Step 10: ストーリー対応の最終確認**
  - US-01〜US-05 の各 Scenario が、いずれかのテストで検証されていることを対応表（`business-rules.md`）と照合する。足りないテストは追加する
  - 重複ファイル（`*_new`・`*_modified` 等）がないこと、`git status` の差分が計画に列挙したファイルに収まることを確認する

## ストーリー進捗

- [x] US-01 CSV ダウンロード（Step 1・4・6・7・8）
- [x] US-02 CSV の内容（Step 1・2・3・4）
- [x] US-03 期間とステータスでの絞り込み（Step 1・3・4）
- [x] US-04 権限のないロールの拒否（Step 1・4・7・8）
- [x] US-05 特殊文字と数式の安全な出力（Step 1・2）

## 変更ファイル一覧（予定）

- **Created（backend）**: `CsvWriter.java`、`ReportCondition.java`、`ReservationReportService.java`、`ReportController.java`、`CsvWriterTest.java`、`ReservationReportServiceTest.java`、`ReportControllerTest.java`
- **Modified（backend）**: `ReservationRepository.java`
- **Created（frontend）**: `CsvDownloadButton.tsx`、`app/api/reports/reservations/csv/route.ts`、`csv-download-button.test.tsx`、`reports-csv-route.test.ts`
- **Modified（frontend）**: `reservations/page.tsx`、`tests/unit/reservations-page.test.tsx`（`msw/handlers.ts` は変更しない）
- **Modified（docs）**: `api-spec.md`、`screen-spec.md`、`requirements.md`（spec）
- **Created（AI-DLC 文書）**: `construction/csv-report/code/backend-summary.md`、`frontend-summary.md`
