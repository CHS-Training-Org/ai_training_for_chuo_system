# Code Generation Plan: csv-export

このプランが Code Generation の唯一の正。ユニットは縦切り 1 つ（BE + FE + 仕様書）。

## Unit Context
- **要件**: `requirements.md` の RPT-01〜18。受入条件はシートの 5 項目
- **設計**: `application-design/` 配下（Route Handler 中継、`ReportController`、`ReportService`、`ReservationCsvWriter`、`ReservationSpecifications`）
- **Stories**: なし（User Stories は SKIP）
- **依存**: DB スキーマ変更なし。`ReservationService` と `GET /api/reservations` は変更しない
- **コード配置**: ワークスペースルート（`backend/`、`frontend/`、`docs-next/`）。`Docs/spec/aidlc-docs/` にはコードを置かない

## Steps

### Spec-first
- [x] Step 1: `/update-spec` で `docs-next/docs/spec/api-spec.md` に §帳票出力 を追加（エンドポイント一覧表、`GET /api/reports/reservations/csv` のパラメータ、レスポンスヘッダ、CSV の列と書式、数式対策、エラー 400 / 401 / 403）。`docs-next/CLAUDE.md` の文章規範を守る
- [x] Step 2: `/update-spec` で `screen-spec.md` に `/admin/reservations` を追加（画面一覧表、画面遷移図、サイドナビ表、UI 要素、バリデーション、アクセス制御）
- [x] Step 3: `requirements.md` の API 権限マトリクスと画面アクセス権限表に行を追加（UC 番号は変更しない）。`index.md` など総数の明示記載（画面数など）を grep で洗い出して更新
- [x] Step 4: `enhancements/intermediate/csv-export.md` の影響範囲（`/admin/resources` ではなく `/admin/reservations`）を実態に合わせる
- [x] Step 5: `cd docs-next && npm run build` でリンク・アンカーの破損がないことを確認

### Backend
- [x] Step 6: `domain/ReservationSpecifications.java` を新規作成（`startAtFrom`、`startAtBefore`、`statusIn`、`forReport`。fetch join 付き）
- [x] Step 7: `domain/ReservationRepository.java` を `JpaSpecificationExecutor<Reservation>` 継承に変更（既存メソッドは変更しない。Javadoc を更新）
- [x] Step 8: `application/ReservationCsvRow.java`（record）と `application/ReservationCsvWriter.java` を新規作成（BOM、日本語ヘッダ、CRLF、RFC 4180、数式対策、`yyyy-MM-dd HH:mm`、ステータスのラベル）
- [x] Step 9: `application/ReportService.java` を新規作成（日付 → 日時範囲、`findAll(spec, Sort)`、行変換、`@Transactional(readOnly = true)`）
- [x] Step 10: `presentation/ReportController.java` を新規作成（`@PreAuthorize("hasRole('ADMIN')")`、`from > to` の 400、`Content-Disposition`、ファイル名）。CSV 本文はログに出さない
- [x] Step 11: `ReservationCsvWriterTest`（新規、DB なし）: ヘッダと BOM、CRLF、カンマ・改行・二重引用符、`=` `+` `-` `@` の無害化、日時書式、全ステータスのラベル、0 件はヘッダのみ
- [x] Step 12: `ReservationSpecificationsTest`（新規）: 期間の境界（`from` 当日 0 時を含む、`to` の翌日 0 時未満）、片方だけの指定、両方省略、ステータス複数、条件の AND
- [x] Step 13: `ReportControllerTest`（新規、`BaseControllerTest` 継承）: ADMIN で 200 とヘッダ、MEMBER と APPROVER で 403、未認証は 401、期間とステータスの絞り込み、`from > to` と不正な日付と不正なステータスは 400、0 件でも 200、ファイル名
- [x] Step 14: `./gradlew spotlessApply`、`./gradlew checkstyleMain`、`./gradlew test`

### Frontend
- [x] Step 15: `src/lib/api-client.ts` に `getRaw(path, params?)` を追加（非 2xx は既存どおり `ApiClientError`）
- [x] Step 16: `src/app/api/reports/reservations/csv/route.ts` を新規作成（クエリ転送、`Content-Type` と `Content-Disposition` の引き継ぎ、エラーは `{ code, message }` と元のステータスで返す）
- [x] Step 17: `src/app/(authenticated)/admin/reservations/ReservationReportForm.tsx` を新規作成（`type="date"` 2 つ、ステータスのチェックボックス、`from > to` の事前検証、`fetch` から Blob でダウンロード、失敗時は sonner のトースト、`data-testid` を付ける）
- [x] Step 18: `src/app/(authenticated)/admin/reservations/page.tsx` を新規作成（見出し、説明、フォームの配置）
- [x] Step 19: `src/components/layout/nav-items.ts` の ADMIN メニューに「予約帳票」を追加し、`tests/unit/layout/nav-items.test.ts` を更新
- [x] Step 20: テスト追加: `route.ts`（成功の中継、ヘッダ引き継ぎ、403 と 400 の中継、MSW）、`ReservationReportForm`（`from > to` でトースト、成功でダウンロード、失敗でトースト）、`getRaw`
- [x] Step 21: `pnpm lint`、`pnpm format:check`、`pnpm test`

### Summary
- [x] Step 22: `Docs/spec/aidlc-docs/construction/csv-export/code/summary.md` に変更ファイル一覧（Modified / Created）を記録

## 検証の位置づけ
Step 5、14、21 は各層の自己確認。結果は Build and Test ステージで再度まとめる。

## Scope Notes
- ストリーミング出力、件数上限、E2E は対象外
- UC 番号の食い違い（Issue #162）は触らない
- `ReservationService` と `GET /api/reservations` は変更しない
