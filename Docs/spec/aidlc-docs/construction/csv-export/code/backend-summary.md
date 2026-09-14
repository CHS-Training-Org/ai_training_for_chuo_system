# Backend Code Generation Summary — Unit: csv-export

## 変更ファイル

- **編集**: `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java`
  - `findByPeriodFetch(from, to, pageable)` を追加（期間の重なり判定・`ORDER BY r.startAt ASC`）
  - `findByPeriodAndStatusInFetch(from, to, statuses, pageable)` を追加（期間＋ステータス）

## 新規ファイル

- `backend/src/main/java/com/example/bookflow/application/ReportService.java`
  - `generateReservationsCsv`（期間×ステータスの4分岐でリポジトリ呼び出しを決定 → CSV生成 → UTF-8 BOM付与）
  - `buildCsv`（列マッピング・CRLF）、`escape`（RFC 4180準拠のエスケープ）
  - `STATUS_LABELS`（`ReservationStatus` → 日本語ラベルのマッピング）
- `backend/src/main/java/com/example/bookflow/presentation/ReportController.java`
  - `GET /api/reports/reservations/csv`（`@PreAuthorize("hasRole('ADMIN')")`、`from`/`to`同時指定必須バリデーション）
- `backend/src/test/java/com/example/bookflow/application/ReportServiceTest.java`
  - データ取得4分岐の呼び出し検証（4件）、CSV内容検証（BOM・ヘッダのみ・列マッピング・日本語ステータスラベル・カンマ/ダブルクォート/改行のエスケープ、計7件）
- `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java`
  - ADMIN 200・CSVボディ検証、MEMBER/APPROVER 403、from/to片方指定400（2件）、期間フィルタ・ステータスフィルタの絞り込み検証、対象0件時のヘッダのみ検証

## テスト観点の要約

| 観点 | 対応要件・受入条件 |
|---|---|
| ADMIN限定アクセス | RPT-04、受入条件「MEMBER/APPROVERロールでアクセスすると403が返る」 |
| 期間・ステータス絞り込み | RPT-03、受入条件「期間・ステータスを絞り込んで対象データを限定したCSVをダウンロードできる」 |
| CSV列構成 | RPT-02 |
| CSV生成ロジックのユニットテスト | 受入条件「バックエンドにCSV生成ロジックのユニットテストを追加する」 |
| UTF-8 BOM | 受入条件「文字コードはUTF-8（BOM付き、Excelでの文字化けを防ぐ）」 |

## 未実施（本ステップの対象外）

- `docs-next/docs/spec/api-spec.md` への反映（Build and Test完了後の `/update-spec` に委譲）
