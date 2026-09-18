# Component Methods: CSV 帳票出力

詳細な業務ルール（サニタイズの適用範囲・閉区間の意味・エラー時の挙動）は Functional Design で定義する。ここではメソッドシグネチャと入出力の型のみを示す。

## ReportController

```java
@GetMapping(value = "/reservations/csv", produces = "text/csv")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<StreamingResponseBody> exportReservationsCsv(
    @RequestParam(required = false) LocalDateTime from,
    @RequestParam(required = false) LocalDateTime to,
    @RequestParam(required = false) List<ReservationStatus> status)
```
- **Input**: クエリパラメータ（すべて任意）
- **Output**: `text/csv` の `StreamingResponseBody`。`from > to` の場合は例外を送出（400）

## ReservationReportService

```java
@Transactional(readOnly = true)
public void writeReservationCsv(
    OutputStream out, LocalDate from, LocalDate to, Collection<ReservationStatus> statuses)
    throws IOException
```
- **Input**: 出力先ストリーム、期間（任意）、ステータス群（任意）
- **Output**: なし（`out` に書き込む副作用）

## ReservationCsvWriter

```java
public void write(OutputStream out, Stream<ReservationCsvRow> rows) throws IOException
```
- **Input**: 出力先ストリーム、行データのストリーム
- **Output**: なし（`out` に書き込む副作用）。`out` はクローズしない

## ReservationRepository（追加メソッド）

```java
Stream<ReservationCsvRow> streamCsvRowsForReport(
    LocalDateTime from, LocalDateTime toExclusive, Collection<ReservationStatus> statuses)
```
- **Input**: 非 null の期間・ステータス（Service が正規化済み）
- **Output**: `ReservationCsvRow` のストリーム（呼び出し側が `try-with-resources` でクローズする）

## reports.ts（フロントエンド純関数）

```ts
function buildCsvDownloadUrl(filter: { from?: string; to?: string; status?: string }): string
function parseFilenameFromContentDisposition(header: string | null, fallback: string): string
function triggerBrowserDownload(blob: Blob, filename: string): void
```

## Route Handler

```ts
export async function GET(request: Request): Promise<Response>
```
- **Input**: クエリパラメータ `from`・`to`・`status`（許可リストのみ転送）
- **Output**: バックエンドのレスポンスをステータス・ヘッダ・ボディともそのまま中継
