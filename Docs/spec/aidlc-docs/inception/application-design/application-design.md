# Application Design（統合版）: CSV 帳票出力（Issue #29）

詳細は同ディレクトリの `components.md` / `component-methods.md` / `services.md` / `component-dependency.md` を参照。判断の根拠は `Docs/spec/aidlc-docs/inception/plans/application-design-plan.md`。

## 設計判断

### 確認質問の回答（Q1〜Q7）

| # | 論点 | 決定 |
|---|------|------|
| Q1 | 予約データの取得方式 | Specification（`ReservationSpecifications` 新設、`ReservationRepository` に `JpaSpecificationExecutor`） |
| Q2 | 応答の返し方と件数上限 | `ResponseEntity<byte[]>` で一括、上限なし |
| Q3 | CSV の生成方法 | 手書き（依存追加なし） |
| Q4 | 承認状態の表示名の置き場所 | application 層の `ReservationCsvWriter` の中 |
| Q5 | 画面の入力 UI | ダイアログ（期間とステータスの複数選択） |
| Q6 | ファイル名 | `reservations_yyyyMMdd.csv` |
| Q7 | 改行コード | CRLF |

### 既存規約・前例から決めた事項（D1〜D11）

| # | 決定 | 根拠 |
|---|------|------|
| D1 | Server Action で取得し、ブラウザで Blob 化 | Server Actions への集約（規約） |
| D2 | CSV 生成は application 層 | 4 層の責務表 |
| D3 | `@PreAuthorize("hasRole('ADMIN')")` | 既存 Controller の前例 |
| D4 | `from` / `to` の検証は Controller | `ResourceController` の前例 |
| D5 | `datetime-local` | `ResourceFilterForm` の前例 |
| D6 | 失敗時は `toast.error` | `ApprovalTable` の前例 |
| D7 | CSV インジェクション対策は採用しない | 要件外（スコープを広げない） |
| D8 | ダイアログは `Dialog` + `useState` + `useTransition` | `ApprovalTable` の前例 |
| D9 | ステータスはネイティブのチェックボックス 4 種、未選択は全ステータス | ui 部品なし、`ALL_STATUSES` の前例 |
| D10 | ファイル名は BE の `Content-Disposition`、日付は `LocalDate.now()` | API が出力元、既存の日時の扱い |
| D11 | BOM は `TextDecoder` の `ignoreBOM: true` で残す | `res.text()` は BOM を取り除くため |

## コンポーネント構成

| 層 | コンポーネント | 新規 / 変更 |
|----|--------------|-----------|
| presentation | `ReportController` | 新規 |
| application | `ReservationReportService`、`ReservationCsvWriter` | 新規 |
| domain | `ReservationSpecifications` | 新規 |
| domain | `ReservationRepository`（`JpaSpecificationExecutor` を追加） | 変更 |
| FE lib | `api-client.ts`（`getText` を追加） | 変更 |
| FE server/actions | `reports.ts`（`exportReservationsCsvAction`） | 新規 |
| FE app | `reservations/CsvExportDialog.tsx` | 新規 |
| FE app | `reservations/page.tsx`（ADMIN のときだけダイアログを表示） | 変更 |

DB スキーマ、既存 API（`GET /api/reservations` ほか）、`ReservationService` は変えない。

## 画面の文言（提案。承認時に確認してほしい点）

前例があるものは前例に合わせ、前例のないものは提案として示す。変更したい場合は Request Changes で指示してほしい。

| 箇所 | 文言 | 根拠 |
|------|------|------|
| ダイアログを開くボタン | 「CSV ダウンロード」 | RPT-05（確定） |
| 期間の入力欄のラベル | 「開始日時」「終了日時」 | `ResourceFilterForm` の前例 |
| ステータスの選択肢 | 「承認待ち」「承認済み」「却下」「キャンセル済み」 | `labels.ts` の `RESERVATION_STATUS_LABELS` |
| ダイアログの見出し | 「CSV ダウンロード」 | 提案（前例なし） |
| ステータス欄のラベル | 「ステータス」 | 提案（前例なし） |
| 実行ボタン | 「ダウンロード」 | 提案（前例なし） |
| 失敗時のトースト | 「CSV のダウンロードに失敗しました。」 | 提案（`ApprovalTable` の「承認に失敗しました。」の形に合わせた） |
| ダイアログを閉じるボタン | 「キャンセル」 | `ApprovalTable` の承認・却下ダイアログの前例 |

## 受入条件との対応

| 受入条件 | 担うコンポーネント |
|---------|------------------|
| AC-1.1 ボタンからダウンロード | `CsvExportDialog`、`exportReservationsCsvAction`、`ReportController` |
| AC-1.2 BOM・日本語ヘッダ | `ReservationCsvWriter`（BOM の保持は `getText` と Blob 化） |
| AC-1.3 全件・開始日時の昇順 | `ReservationReportService`（Sort）、`ReservationSpecifications` |
| AC-1.4 表記 | `ReservationCsvWriter` |
| AC-1.5 エスケープ | `ReservationCsvWriter` |
| AC-1.6 0 件はヘッダだけ | `ReservationCsvWriter` |
| AC-2.1・2.2 開始日時での判定 | `ReservationSpecifications`（`startAtFrom` / `startAtBefore`） |
| AC-2.3・2.4 片方だけ・`from` ≧ `to` の 400 | `ReportController` |
| AC-2.5 オフセット付きの 400 | `ReportController` の型変換と既存の `GlobalExceptionHandler` |
| AC-3.1〜3.3 ステータス・組み合わせ | `ReservationSpecifications`（`statusIn`）と `allOf` |
| AC-4.1 ADMIN 以外にボタンを出さない | `reservations/page.tsx`（`isAdmin`） |
| AC-4.2〜4.4 403 / 403 / 401 | `ReportController` の `@PreAuthorize` と既存の Security 設定 |

## テストの方向性（詳細は Code Generation の計画で確定）

- BE：`ReservationCsvWriter` のユニットテスト（シートの受入条件「CSV 生成ロジックのユニットテスト」）、`ReportController` の結合テスト（ロール別、400、ヘッダ。`UserControllerTest` の様式）、期間・ステータス・並び順の実クエリのテスト（H2）
- FE：`exportReservationsCsvAction` の Vitest + MSW（ファイル名と BOM の受け渡し、エラー）、`CsvExportDialog` のコンポーネントテスト

## Spec 更新 2 回目に反映する事項

- `api-spec.md`：新規 §帳票出力（`GET /api/reports/reservations/csv` のクエリ、応答ヘッダ、CSV の形式、エラー）とエンドポイント一覧
- `screen-spec.md` §`/reservations`：ダイアログの入力項目と文言
- `requirements.md` 非機能要件「一覧系 API は page/size 方式」と、CSV の全件出力の関係の明記（Spec 更新 1 回目の報告事項）
