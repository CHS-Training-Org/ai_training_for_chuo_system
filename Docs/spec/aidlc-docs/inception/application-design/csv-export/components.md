# Components（csv-export）

**作成日時**: 2026-10-26T01:37:50+00:00
**前提となる決定**: D-1 = `ResponseEntity<byte[]>`、D-2 = 自前実装、D-3 = Route Handler + GET フォーム、エラー時は画面へリダイレクト、クエリは `Specification`、CSV 生成部は presentation、画面は `/admin/reports`「帳票出力」（`../../plans/csv-export/application-design-plan.md` の回答）

## backend（`com.example.bookflow`）

| コンポーネント | レイヤー / 配置 | 種別 | 責務 |
|---|---|---|---|
| `ReportController` | `presentation/ReportController.java` | 新規 | `GET /api/reports/reservations/csv` の受け口。ADMIN 限定（`@PreAuthorize("hasRole('ADMIN')")`）。クエリパラメータを受け取り、Service と CSV 生成部を呼び、`Content-Type` と `Content-Disposition`（ファイル名の日時を含む）を付けて `ResponseEntity<byte[]>` を返す |
| `ReservationCsvWriter` | `presentation/csv/ReservationCsvWriter.java` | 新規（`@Component`） | 行の一覧を CSV にして `OutputStream` に書く。BOM、ヘッダ行、列順、日時書式、承認状態の日本語ラベル、CSV インジェクション対策、RFC 4180 のエスケープ、CRLF。HTTP と DB に依存しない |
| `ReservationReportService` | `application/ReservationReportService.java` | 新規 | 期間とステータスの検証と条件の組み立て、予約の取得、行 DTO への詰め替え。読み取り専用トランザクション |
| `ReservationCsvRow` | `application/ReservationCsvRow.java` | 新規（record） | CSV の 1 行分のデータ。LAZY 関連をトランザクション内で読み終えるための詰め替え先 |
| `ReservationSpecifications` | `domain/ReservationSpecifications.java` | 新規（ユーティリティ） | 予約の検索条件（開始日時の下限、上限、ステータス、関連の JOIN FETCH）を `Specification<Reservation>` として提供する |
| `ReservationRepository` | `domain/ReservationRepository.java` | 変更 | `JpaSpecificationExecutor<Reservation>` を追加で継承する。既存メソッドは変えない |

既存のまま使うもの：`GlobalExceptionHandler`（400 / 403 の JSON）、`ValidationException`、`SecurityConfig`（`@EnableMethodSecurity`）、`CurrentUser` は使わない（ADMIN は全ユーザーの予約が対象で、ログインユーザーによる絞り込みがないため）。

## frontend（`frontend/src`）

| コンポーネント | 配置 | 種別 | 責務 |
|---|---|---|---|
| CSV 中継 Route Handler | `app/api/reports/reservations/csv/route.ts` | 新規（`GET`） | 受け取ったクエリから `from` / `to` / `status` の空でない値だけを取り出し、JWT を付けて backend を呼ぶ。成功時は本文と `Content-Type` / `Content-Disposition` を中継する。トークンなし、または 401 は `/auth/signin` へ、それ以外のエラーは `/admin/reports?error=<code>` へリダイレクトする |
| `api-client.ts` | `lib/api-client.ts` | 変更 | `getRaw(path, params)` を追加する。URL の組み立て、トークン付与、エラー時の `ApiClientError` を既存の `request` で再利用し、`Response` を返す。既存メソッドは変えない |
| 帳票出力ページ | `app/(authenticated)/admin/reports/page.tsx` | 新規（Server Component） | 画面「帳票出力」。`searchParams.error` に応じたエラーメッセージを表示し、フォームを配置する。ADMIN のガードは既存の `admin/layout.tsx` |
| `ReservationCsvExportForm` | `app/(authenticated)/admin/reports/ReservationCsvExportForm.tsx` | 新規（Client Component） | 開始日、終了日、ステータスのチェックボックス 4 種、「CSV ダウンロード」ボタン。`<form method="get" action="/api/reports/reservations/csv">`。送信前に開始日が終了日より後なら送信を止め、画面にメッセージを出す |
| `nav-items.ts` | `components/layout/nav-items.ts` | 変更 | ADMIN 専用項目の末尾に「帳票出力」（`/admin/reports`）を追加する |
| `labels.ts` | `lib/labels.ts` | 変更なし | チェックボックスのラベルに `RESERVATION_STATUS_LABELS` を使う |

## 仕様（`docs-next/docs/spec/`）

| ファイル | 変更 |
|---|---|
| `api-spec.md` | §帳票出力 を新設し `GET /api/reports/reservations/csv` を記載。エンドポイント一覧表に行を追加。API 設計方針の「レスポンス形式」に CSV の例外を追記 |
| `screen-spec.md` | 画面一覧に `/admin/reports` を追加。サイドナビ表に「帳票出力」を追加。`/admin/reports` の節（アクセス制御、UI 要素、エラー表示）を追加 |
