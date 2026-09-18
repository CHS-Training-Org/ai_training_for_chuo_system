# Code Generation Summary: csv-export

## Spec-first ドキュメント更新

- `docs-next/docs/spec/requirements.md`：UC-09 新設・API 権限マトリクス/画面アクセス権限に行追加・学習者拡張課題表の矛盾解消
- `docs-next/docs/spec/api-spec.md`：エンドポイント一覧に追加・§帳票出力セクション新設
- `docs-next/docs/spec/screen-spec.md`：画面一覧・サイドナビ表に追加・§帳票出力セクション新設
- `docs-next/docs/spec/enhancements/intermediate/csv-export.md`：UC-07→UC-09 修正、更新対象 spec の記述修正
- `docs-next/docs/reference/adr/ADR-033-backend-csv-library.md`：新規作成
- `docs-next/docs/reference/adr/index.md`：ADR-033 の行を追加

## バックエンド（新規作成）

- `backend/src/main/java/com/example/bookflow/domain/ReservationCsvRow.java`
- `backend/src/main/java/com/example/bookflow/application/ReservationCsvWriter.java`
- `backend/src/main/java/com/example/bookflow/application/ReservationReportService.java`
- `backend/src/main/java/com/example/bookflow/presentation/ReportController.java`
- `backend/src/test/java/com/example/bookflow/application/ReservationCsvWriterTest.java`（18テスト）
- `backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java`（8テスト）
- `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java`（9テスト）

## バックエンド（変更）

- `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java`：`streamCsvRowsForReport` を追加
- `backend/build.gradle.kts`：opencsv 5.12.0 を追加（ADR-033）

## フロントエンド（新規作成）

- `frontend/src/app/api/reports/reservations/csv/route.ts`
- `frontend/src/lib/reports.ts`
- `frontend/src/app/(authenticated)/admin/reports/page.tsx`
- `frontend/src/app/(authenticated)/admin/reports/ReportExportClient.tsx`
- `frontend/tests/unit/lib/reports.test.ts`（10テスト）
- `frontend/tests/unit/app/api/reports-csv-route.test.ts`（7テスト）

## フロントエンド（変更）

- `frontend/src/components/layout/nav-items.ts`：`ADMIN_ITEMS` に「帳票出力」を追加
- `frontend/tests/unit/layout/nav-items.test.ts`：`adminHrefs` に `/admin/reports` を追加
- `frontend/tests/unit/msw/handlers.ts`：`MOCK_RESERVATIONS_CSV` と絶対 URL ハンドラを追加

## 実装中に発見・修正した不整合

- バックエンドの CSV 承認状態ラベル（当初「申請中」「キャンセル」等）が、フロントエンドの既存 `RESERVATION_STATUS_LABELS`（「承認待ち」「キャンセル済み」等）と食い違っていた。同一概念に別訳語を当てる不整合のため、バックエンドを既存の UI 表記に統一した（`ReservationCsvWriter`・対応テスト・`business-rules.md`・`api-spec.md` を修正）
- `res.text()` は `TextDecoder` が既定で UTF-8 BOM を自動除去するため、Route Handler テストの BOM 検証はバイト列（`arrayBuffer()`）で行う必要があった

## 検証結果

- バックエンド：`./gradlew test spotlessCheck checkstyleMain` — 成功（新規35テストすべて成功。checkstyle の警告2件は本タスクと無関係の既存コード）
- フロントエンド：`pnpm lint format:check build test` — 成功（97テストすべて成功）
- ドキュメント：`cd docs-next && npm run build` — 成功（リンク・アンカー破損なし）

## 既知の未対応事項（別タスク推奨）

- 画面遷移図（`/diagrams/spec/screen-spec-navigation.drawio.svg`）は `/admin/reports` を含まない状態のまま。`drawio-skill` での更新が必要
- 依存脆弱性スキャン（Dependabot 等）は repo 全体で未導入（ADR-033 に記載済み、本タスクのスコープ外）
