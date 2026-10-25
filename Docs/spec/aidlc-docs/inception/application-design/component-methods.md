# Component Methods: CSV 帳票出力（Issue #29）

シグネチャと目的を示す。振る舞いの詳細は `requirements.md`（確定した解釈・仮定 A1〜A3）と `stories.md`（受入条件 18 件）が正で、ここでは再掲しない。引数名・補助メソッドの細部は Code Generation の計画で確定する。

## Backend

### ReportController（presentation）

```java
@GetMapping("/reservations/csv")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<byte[]> downloadReservationsCsv(
    @RequestParam(required = false) LocalDateTime from,
    @RequestParam(required = false) LocalDateTime to,
    @RequestParam(required = false) List<ReservationStatus> status)
```

- **Purpose**: 条件の検証（片方だけ・`from` ≧ `to` は `ValidationException`）、Service の呼び出し、CSV 応答の組み立て
- **Input**: `from` / `to`（ISO 8601 ローカル日時。オフセット付きは型変換に失敗し、既存の `GlobalExceptionHandler` で 400）、`status`（複数可、未指定は全ステータス）
- **Output**: `200 OK`、本文は CSV のバイト列、ヘッダ `Content-Type: text/csv; charset=UTF-8` と `Content-Disposition: attachment; filename="reservations_yyyyMMdd.csv"`（日付は `LocalDate.now()`）
- クラスには `@RestController` と `@RequestMapping("/api/reports")` を付ける

### ReservationReportService（application）

```java
@Transactional(readOnly = true)
public byte[] exportReservationsCsv(
    LocalDateTime from, LocalDateTime to, Collection<ReservationStatus> statuses)
```

- **Purpose**: 条件に合う予約を開始日時の昇順で全件取得し、CSV のバイト列を返す
- **Input**: 検証済みの条件（`from` と `to` は両方 null か両方非 null。`statuses` は null または空なら条件なし）
- **Output**: CSV のバイト列（BOM・ヘッダ行を含む）

### ReservationCsvWriter（application）

```java
public final class ReservationCsvWriter {
  public static byte[] write(List<Reservation> reservations)
}
```

- **Purpose**: 予約のリストを、RPT-02 の形式（BOM、日本語ヘッダ、表記、エスケープ、CRLF）の CSV にする
- **Input**: `resource` と `requester` が初期化済みの予約（並び順は呼び出し側の責務）
- **Output**: UTF-8 の CSV のバイト列。空リストならヘッダ行だけ
- 承認状態の表示名の対応表、日時の書式、エスケープ処理はこのクラスの非公開メンバーにする

### ReservationSpecifications（domain）

```java
public final class ReservationSpecifications {
  public static Specification<Reservation> startAtFrom(LocalDateTime from)      // start_at >= from
  public static Specification<Reservation> startAtBefore(LocalDateTime to)      // start_at < to
  public static Specification<Reservation> statusIn(Collection<ReservationStatus> statuses)
  public static Specification<Reservation> fetchResourceAndRequester()
}
```

- **Purpose**: Service が `Specification.allOf` で AND 結合して `ReservationRepository#findAll(Specification, Sort)` に渡す条件の部品
- `fetchResourceAndRequester()` はページングしない全件取得でのみ使う（件数クエリを発行しないため JOIN FETCH と両立する）

### ReservationRepository（domain、変更）

```java
public interface ReservationRepository
    extends JpaRepository<Reservation, UUID>, JpaSpecificationExecutor<Reservation>
```

- `findAll(Specification<Reservation>, Sort)` を継承で得る。並び順は `Sort.by("startAt").ascending()`

## Frontend

### api-client.ts（追加メソッド）

```typescript
async function getText(
  path: string,
  params?: Record<string, string | string[]>,
): Promise<{ text: string; headers: Headers }>
```

- **Purpose**: 非 JSON の応答を受け取る。本文は `TextDecoder("utf-8", { ignoreBOM: true })` でデコードし、BOM を文字列に残す（D11）
- 非 2xx は既存の `assertOk` で `ApiClientError` を投げる（エラー本文は JSON の `{code, message}`）

### reports.ts（Server Action）

```typescript
"use server";

export async function exportReservationsCsvAction(params?: {
  from?: string;      // datetime-local の値（例 "2026-06-01T00:00"）
  to?: string;
  status?: string[];
}): Promise<{ filename: string; content: string }>
```

- **Purpose**: ADMIN の CSV 取得。`from` / `to` を秒付きに正規化し（既存 `reservations.ts` の `toIsoWithSeconds` と同じ処理）、`getText("/reports/reservations/csv", ...)` を呼ぶ。`Content-Disposition` の `filename` を取り出して返す
- 引数の型は既存の `reservations.ts` と同じく、ファイル内の非公開の型にする（`'use server'` の制約）

### CsvExportDialog.tsx（Client Component）

```typescript
export function CsvExportDialog(): JSX.Element
```

- **Purpose**: ダイアログの開閉（「キャンセル」ボタンでも閉じる。`ApprovalTable` の前例）、入力の保持（`useState`）、送信（`useTransition` 内で `exportReservationsCsvAction` を呼ぶ）、Blob の生成とダウンロード（`URL.createObjectURL` → `<a download>` のクリック → `URL.revokeObjectURL`）、成功時にダイアログを閉じる、失敗時の `toast.error`
- Blob の型は `text/csv;charset=utf-8`。受け取った文字列（先頭に BOM を含む）をそのまま渡す

### reservations/page.tsx（変更）

- 見出し行の右側（既存の「リソースを探す」ボタンの隣）に、`isAdmin` のときだけ `<CsvExportDialog />` を置く
