# Component Methods — CSV 帳票出力

メソッドシグネチャと入出力型のみを定義する。業務ルールの詳細は `requirements.md`（FR-03〜13）と、各 Code Generation で確定する。

## BE

### C1 `ReportController`

```java
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<StreamingResponseBody> exportReservationsCsv(
      @RequestParam(required = false) List<ReservationStatus> status,
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to);
}
```

| 項目 | 内容 |
|---|---|
| 入力 | `status`（任意・複数可）、`from` / `to`（任意・ISO 日時。既存 `ResourceController` と同じ受け方） |
| 出力 | `200` + `StreamingResponseBody`。ヘッダは `Content-Type: text/csv; charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_yyyyMMdd_HHmmss.csv"`、`Cache-Control: no-store` |
| 処理順 | (1) `service.validate(from, to)`（呼び出しスレッドで同期実行）→ (2) ヘッダ組み立て（ファイル名はサーバー現在時刻・ローカル日時）→ (3) 本体 `out -> service.writeReservationsCsv(status, from, to, out)` を返す |
| 失敗 | 型変換失敗・`from` >= `to` は 400、権限なしは 403、未認証は 401（すべて既存ハンドラ。新規追加なし） |

### C2 `ReservationReportService`

```java
@Service
public class ReservationReportService {

  /** 条件の検証。書き出し開始前に Controller から同期で呼ぶ。 */
  public void validate(LocalDateTime from, LocalDateTime to);

  /** BOM・ヘッダ・全ページの行を out へ書き出す。status が null / 空なら全ステータス。 */
  public void writeReservationsCsv(
      Collection<ReservationStatus> status,
      LocalDateTime from,
      LocalDateTime to,
      OutputStream out) throws IOException;

  // 定数: PAGE_SIZE = 500
}
```

| 項目 | 内容 |
|---|---|
| `validate` | `from` と `to` が両方あり `from` >= `to` なら `ValidationException`（→ 400）。片方のみは許可 |
| `writeReservationsCsv` | 冒頭で `validate` を再実行（fail closed）。`ReservationCsvWriter` を生成し、`writeBom()` → `writeHeader()` →（ページごとに `findForReport` → `writeRows` → `flush`）。`Slice#hasNext()` が false になるまで繰り返す。0 件でもヘッダのみを出力して正常終了 |
| 例外 | `IOException`（クライアント切断など）はそのまま伝播させる。ログには予約内容（PII）を出さない |

### C3 `ReservationCsvWriter`

```java
public class ReservationCsvWriter {

  public ReservationCsvWriter(OutputStream out);

  public void writeBom() throws IOException;                          // EF BB BF
  public void writeHeader() throws IOException;                       // 7 列の日本語ヘッダ + CRLF
  public void writeRows(List<Reservation> reservations) throws IOException; // 1 件 = 1 行（CRLF）
  public void flush() throws IOException;

  // 単体テスト対象の純粋関数
  static String toCell(String raw);                  // 数式注入の無害化 → RFC 4180 エスケープ（この順）
  static String formatDateTime(LocalDateTime value); // yyyy-MM-dd HH:mm
  static String statusLabel(ReservationStatus s);    // switch 式（DRAFT〜CANCELLED を網羅）
}
```

| 項目 | 内容 |
|---|---|
| 列順 | 予約ID, リソース名, 申請者名, 開始日時, 終了日時, 利用目的, ステータス（FR-03） |
| 無害化の対象 | 文字列セル（リソース名・申請者名・利用目的）。予約 ID・日時・ラベルは固定書式のため対象外 |
| ラベル | `labels.ts` と同一表記。`DRAFT`=ドラフト / `PENDING`=承認待ち / `APPROVED`=承認済み / `REJECTED`=却下 / `CANCELLED`=キャンセル済み |

### C4 `ReservationRepository`（追加メソッド）

```java
@Transactional(readOnly = true)
@Query("""
    SELECT r FROM Reservation r
      JOIN FETCH r.resource JOIN FETCH r.requester
    WHERE r.status IN :statuses
      AND (CAST(:from AS LocalDateTime) IS NULL OR r.startAt >= :from)
      AND (CAST(:to AS LocalDateTime) IS NULL OR r.startAt < :to)
    ORDER BY r.startAt ASC, r.id ASC
    """)
Slice<Reservation> findForReport(
    @Param("statuses") Collection<ReservationStatus> statuses,
    @Param("from") LocalDateTime from,
    @Param("to") LocalDateTime to,
    Pageable pageable);   // PageRequest.of(page, 500)。ソートは JPQL 側で固定
```

- `statuses` は Service が「未指定 → `ReservationStatus` 全値」に正規化してから渡すため、コレクション引数の null 比較は不要。
- 上記の `CAST` の型名・書式は擬似コード。H2 / PostgreSQL の両方で通る書き方は Code Generation で確定し、実 PostgreSQL で検証する（#76 の教訓）。通らない場合の代替は「Service が未指定側へ番兵値を渡す」方式とする。

## FE

### C5 Route Handler

```ts
// app/api/reports/reservations/csv/route.ts
export async function GET(request: NextRequest): Promise<Response>;
```

| 項目 | 内容 |
|---|---|
| 入力 | クエリ `status`（複数）、`from`、`to`（`datetime-local` 形式 16 桁を想定。空文字は無視） |
| 成功 | BE が 200 のとき、`res.body` をそのまま返し、`Content-Type` / `Content-Disposition` / `Cache-Control` を引き継ぐ |
| 失敗 | `GET /admin/reports?error=<code>` へ 303。`code` は BE の `{ code }`。JSON を読めない場合は `HTTP_<status>`、JWT なしは `UNAUTHORIZED`、接続失敗は `INTERNAL_SERVER_ERROR` |

### C6 ページ

```ts
// app/(authenticated)/admin/reports/page.tsx
export default async function AdminReportsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element>;

// 表示可能なエラーコード（許可リスト）と日本語メッセージの対応。それ以外は汎用メッセージ
const REPORT_ERROR_MESSAGES: Record<"VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_SERVER_ERROR", string>;
```

### C7 / C8

```ts
// components/layout/nav-items.ts: ADMIN_ITEMS に 1 要素追加（シグネチャ変更なし）
// lib/datetime.ts
export function toIsoWithSeconds(value: string): string; // 16 桁なら ":00" を補う。それ以外は無変更
```
