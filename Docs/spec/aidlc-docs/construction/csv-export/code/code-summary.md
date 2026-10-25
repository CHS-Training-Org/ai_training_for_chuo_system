# Code Summary: csv-export（Issue #29）

Code Generation の変更サマリ（Markdown のみ）。計画は `Docs/spec/aidlc-docs/construction/plans/csv-export-code-generation-plan.md`（全 18 手順、すべて `[x]`）。アプリケーションコードは `backend/` と `frontend/` に置いてあり、このディレクトリにはない。

## 変更したファイル

### Modified（3）

| ファイル | 変更内容 |
|---|---|
| `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` | `JpaSpecificationExecutor<Reservation>` を継承に追加。既存メソッドは変更なし |
| `frontend/src/lib/api-client.ts` | `getText` を追加（`TextDecoder` の `ignoreBOM: true` で UTF-8 BOM を保持）。既存メソッドは変更なし |
| `frontend/src/app/(authenticated)/reservations/page.tsx` | `isAdmin` のときだけ `CsvExportDialog` を表示。「リソースを探す」ボタンと並べるため `div` で包んだ以外の変更なし |

### Created（本体 6）

| ファイル | 役割 |
|---|---|
| `backend/src/main/java/com/example/bookflow/domain/ReservationSpecifications.java` | 期間（`startAt` が from 以上・to 未満）、ステータス、JOIN FETCH の条件部品 |
| `backend/src/main/java/com/example/bookflow/application/ReservationCsvWriter.java` | CSV 生成（BOM、日本語ヘッダ、CRLF、`yyyy/MM/dd HH:mm`、承認状態の日本語表示名、RFC 4180 エスケープ） |
| `backend/src/main/java/com/example/bookflow/application/ReservationReportService.java` | 条件を AND 結合して開始日時の昇順で全件取得し、CSV にする（読み取り専用トランザクション） |
| `backend/src/main/java/com/example/bookflow/presentation/ReportController.java` | `GET /api/reports/reservations/csv`（`@PreAuthorize("hasRole('ADMIN')")`、from/to の検証、応答ヘッダ） |
| `frontend/src/server/actions/reports.ts` | `exportReservationsCsvAction`（日時の正規化、ファイル名の取り出し） |
| `frontend/src/app/(authenticated)/reservations/CsvExportDialog.tsx` | ダイアログ（開始日時・終了日時・ステータス 4 種、Blob ダウンロード、失敗時トースト） |

### Created（テスト 7）

| ファイル | 件数 |
|---|---|
| `backend/src/test/java/com/example/bookflow/application/ReservationCsvWriterTest.java` | 13 |
| `backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java` | 5 |
| `backend/src/test/java/com/example/bookflow/domain/ReservationSpecificationsTest.java` | 7 |
| `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java` | 20 |
| `frontend/tests/unit/server/actions/reports.test.ts` | 9 |
| `frontend/tests/unit/lib/api-client.test.ts` | 4 |
| `frontend/tests/unit/reservations/csv-export-dialog.test.tsx` | 7 |

変更していないもの: `build.gradle.kts`（依存追加なし）、Flyway、`docs-next/docs/spec/`、`.claude/` 配下、`frontend/tests/unit/setup.ts`（polyfill は不要だった）、既存の `ReservationService` / `ReservationController`。重複ファイル（`*_modified` など）は作られていない。

## 計画との差異

- `ReservationSpecifications.fetchResourceAndRequester()` は、件数クエリ（結果型が `Long`）では JOIN FETCH しない条件を付けた（計画 Step 2 が許容した選択肢）。
- `from` ≧ `to` の 400 のメッセージは「from は to より前の日時を指定してください。」とした。
- 計画外の変更、依存・テスト環境の変更はない。

## テスト結果

| 区分 | コマンド | 結果 |
|---|---|---|
| BE | `./gradlew test` | 全 200 件 pass（失敗 0、スキップ 0。既存テストは変更なしで pass） |
| BE | `./gradlew spotlessApply` / `checkstyleMain` | 整形済み。Checkstyle の警告 2 件は既存の `ReservationRepository` のメソッド名（`findByResource_IdAndStatusIn` ほか 1 件、今回の変更前から存在）。新規コードの警告なし |
| FE | `pnpm test` | 14 ファイル 112 件 pass |
| FE | `pnpm lint` / `pnpm format:check` / `npx tsc --noEmit` | 指摘なし / pass / エラーなし |

offset 付き日時（`+09:00`）は想定どおり 400 `VALIDATION_ERROR` になる（`ReportControllerTest`）。

## 受入条件とテストの対応

| 受入条件 | 主な検証 |
|---|---|
| AC-1.1 ボタンからダウンロード・`text/csv` | `ReportControllerTest`（ヘッダ）、`reports.test.ts`、`csv-export-dialog.test.tsx`、実画面 |
| AC-1.2 UTF-8 BOM・日本語ヘッダ | `ReservationCsvWriterTest`、`ReportControllerTest`、`api-client.test.ts`、`csv-export-dialog.test.tsx`、実画面 |
| AC-1.3 全件・開始日時の昇順 | `ReservationSpecificationsTest`、`ReportControllerTest`、実画面 |
| AC-1.4 値の表記 | `ReservationCsvWriterTest`、`ReportControllerTest`、実画面 |
| AC-1.5 エスケープ | `ReservationCsvWriterTest`、`ReportControllerTest` |
| AC-1.6 0 件はヘッダだけ | `ReservationCsvWriterTest`、`ReservationReportServiceTest`、`ReportControllerTest` |
| AC-2.1・2.2 開始日時での判定 | `ReservationSpecificationsTest`、`ReportControllerTest`、実画面（期間指定） |
| AC-2.3・2.4・2.5 400 | `ReportControllerTest`、実画面（片方だけ指定でトースト） |
| AC-3.1〜3.3 ステータス・組み合わせ | `ReservationSpecificationsTest`、`ReportControllerTest`、実画面（「承認済み」のみ） |
| AC-4.1 ADMIN 以外にボタンを出さない | コード確認（`isAdmin` の条件分岐 1 か所）、実画面（MEMBER・APPROVER） |
| AC-4.2〜4.4 403 / 403 / 401 | `ReportControllerTest`（実起動した BE への未認証アクセスも 401 を確認） |
| シート：CSV 生成ロジックのユニットテスト | `ReservationCsvWriterTest` |

## 実画面確認（ユーザーが実施、2026-10-24）

環境: 既存の devcontainer（postgres / cognito-local は起動済み）。Backend は `cd backend && ./gradlew bootRun`、Frontend は `cd frontend && pnpm dev` で起動。DB は既存の `seed.sql` 投入済みデータ（予約 2 件）を使い、`seed.sql` の再実行・DB の変更・追加データの投入はしていない。確認後、起動したプロセスは停止済み。

- **ADMIN**:
  - `/reservations` に「CSV ダウンロード」ボタンが「リソースを探す」の左側に表示され、既存画面に崩れなし。
  - ダイアログの開始日時・終了日時・ステータス 4 種・キャンセル・ダウンロードの表示を確認。
  - 条件なしでダウンロード成功。ファイル名は `reservations_20261024.csv`。UTF-8 BOM、日本語 7 列ヘッダ、2 件、開始日時昇順、`yyyy/MM/dd HH:mm`、ステータスの日本語表記を確認。
  - 「承認済み」のみで承認済み 1 件、`2026/06/03 00:00〜2026/06/04 00:00` で 6/3 の承認待ち 1 件だけの CSV になることを確認。
  - 開始日時のみ指定（終了日時は空）の場合、ダウンロードされず、トースト「CSV のダウンロードに失敗しました。」が出てダイアログが開いたままになることを確認。
- **MEMBER（田中 花子）**: ボタンが表示されず、既存の予約一覧が正常に表示される。
- **APPROVER（鈴木 一郎）**: ボタンが表示されず、既存画面が正常に表示される。

実画面で確認していない項目: 複数ステータスの選択、期間境界（from を含み to を含まない）の細部、カンマ・ダブルクォートを含む目的のエスケープ、ダウンロードしたファイルを Excel で開いた表示。いずれも BE の結合テスト・ユニットテストで確認している。Excel での表示は未確認。

## 未解決事項

なし。
