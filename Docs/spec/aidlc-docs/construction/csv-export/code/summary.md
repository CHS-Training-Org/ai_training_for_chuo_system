# Code Generation Summary: csv-export

実装計画 `construction/plans/csv-export-code-generation-plan.md` の 22 ステップをすべて完了した。

## Modified
- `docs-next/docs/spec/api-spec.md` - エンドポイント一覧に「帳票出力」を追加し、§帳票出力（`GET /api/reports/reservations/csv`）を新設
- `docs-next/docs/spec/screen-spec.md` - 画面一覧、サイドナビ、`/admin/reservations` の節を追加（全 12 画面）
- `docs-next/docs/spec/requirements.md` - API 権限マトリクスと画面アクセス権限表に行を追加（UC 番号は変更なし）
- `docs-next/docs/spec/index.md` - 画面数の記載を更新
- `docs-next/docs/spec/enhancements/intermediate/csv-export.md` - 影響範囲を `/admin/reservations` に合わせて更新
- `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` - `JpaSpecificationExecutor` を継承に追加
- `frontend/src/lib/api-client.ts` - 非 JSON 応答用の `getRaw` を追加
- `frontend/src/components/layout/nav-items.ts` - ADMIN メニューに「予約帳票」を追加
- `frontend/tests/unit/layout/nav-items.test.ts` - 新しいナビ項目に合わせて更新

## Created
### backend
- `domain/ReservationSpecifications.java`
- `application/ReservationCsvRow.java`、`ReservationCsvWriter.java`、`ReportService.java`
- `presentation/ReportController.java`
- テスト: `ReservationCsvWriterTest`（14）、`ReservationSpecificationsTest`（9）、`ReportControllerTest`（14）
### frontend
- `src/app/api/reports/reservations/csv/route.ts`
- `src/app/(authenticated)/admin/reservations/page.tsx`、`ReservationReportForm.tsx`
- `src/lib/download.ts`
- テスト: `tests/unit/api/reservations-csv-route.test.ts`（6）、`tests/unit/admin/ReservationReportForm.test.tsx`（6）、`tests/unit/lib/download.test.ts`（4）

## 設計からの差分
- `ReservationCsvWriter.write` は設計書の記述（インスタンスメソッド）ではなく、状態を持たないため `static` にした。
- CSV の承認状態ラベルを、要件定義書の「キャンセル」「下書き」から、画面の既存ラベル（`RESERVATION_STATUS_LABELS`）に合わせた「キャンセル済み」「ドラフト」に変更した。Q1 の趣旨（画面の表示と同じ）に沿うため。`requirements.md`（AI-DLC 作業用）、`api-spec.md`、`screen-spec.md`、設計書、テストを更新済み。
- `screen-spec.md` の画面遷移図は drawio 製の画像（`static/diagrams/spec/screen-spec-navigation.drawio.svg`）のため、`/admin/reservations` を追記していない。画面一覧表、サイドナビ表、詳細の節には反映済み。

## 自己確認の結果
- docs: `npm run build` 成功（既存の drawio 画像に関する警告のみ）
- backend: `spotlessCheck` と `checkstyleMain` 成功、`./gradlew test` は 189 件中 0 失敗（今回の追加は 37 件）
- frontend: `pnpm lint`、`pnpm format:check`、`tsc --noEmit`、`pnpm test`（98 件）、`pnpm build` 成功
- 未実施: 実サーバーでの手動確認（Build and Test ステージで手順を示す）
