# Component Methods（csv-export）

**作成日時**: 2026-10-26T01:37:50+00:00

メソッドのシグネチャと入出力を示す。業務ルールの詳細は `../../requirements/csv-export/requirements.md` の FR-2〜FR-8 を正とする（Functional Design はスキップ済み）。名前は Code Generation で既存コードとの整合を見て微調整してよいが、責務の分担は変えない。

## backend

### `ReportController`

```java
@RestController
@RequestMapping("/api/reports")
public class ReportController {

  /** 予約一覧の CSV（ADMIN のみ）。 */
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> reservationsCsv(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<ReservationStatus> status) throws IOException;
}
```

- 出力：`200`、`Content-Type: text/csv; charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_YYYYMMDD_HHmmss.csv"`、本文は BOM 付きの CSV のバイト列。
- ファイル名の日時は `LocalDateTime.now()` を `yyyyMMdd_HHmmss` で整形する。
- `@GetMapping` に `produces` を付けない（エラー時の JSON と衝突させないため）。
- `LocalDate` は `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)` を付けて ISO 形式（`YYYY-MM-DD`）で受け取る。変換できない値は既存の `MethodArgumentTypeMismatchException` の処理で 400 になる。

### `ReservationCsvWriter`

```java
@Component
public class ReservationCsvWriter {

  /** BOM、ヘッダ行、各行を CRLF 区切りで UTF-8 として書く。 */
  public void write(List<ReservationCsvRow> rows, OutputStream out) throws IOException;
}
```

- 内部の補助（private または package-private）：セルの値を整える処理（CSV インジェクション対策 -> RFC 4180 のエスケープの順）、承認状態のラベル変換（`Map<ReservationStatus, String>`）、日時の整形（`yyyy-MM-dd HH:mm:ss`）。
- `out` は閉じない（呼び出し側の責務）。

### `ReservationReportService`

```java
@Service
@Transactional(readOnly = true)
public class ReservationReportService {

  /**
   * 開始日時が [from 00:00, to の翌日 00:00) にある予約を、開始日時・予約 ID の昇順で返す。
   * from / to / statuses はいずれも null 可（null または空は条件なし）。
   *
   * @throws ValidationException from と to が両方指定され from が to より後のとき（400）
   */
  public List<ReservationCsvRow> findRows(
      LocalDate from, LocalDate to, Collection<ReservationStatus> statuses);
}
```

### `ReservationCsvRow`

```java
public record ReservationCsvRow(
    UUID id,
    String resourceName,
    String requesterName,
    LocalDateTime startAt,
    LocalDateTime endAt,
    String purpose,
    ReservationStatus status) {

  /** トランザクション内で呼ぶこと（resource / requester を読む）。 */
  public static ReservationCsvRow from(Reservation r);
}
```

### `ReservationSpecifications`

```java
public final class ReservationSpecifications {

  /** resource と requester を JOIN FETCH する（N+1 回避）。 */
  public static Specification<Reservation> fetchResourceAndRequester();

  /** startAt >= fromInclusive（null なら条件なし）。 */
  public static Specification<Reservation> startAtFrom(LocalDateTime fromInclusive);

  /** startAt < toExclusive（null なら条件なし）。 */
  public static Specification<Reservation> startAtBefore(LocalDateTime toExclusive);

  /** status IN statuses（null または空なら条件なし）。 */
  public static Specification<Reservation> statusIn(Collection<ReservationStatus> statuses);
}
```

- 条件なしのときは、述語として `cb.conjunction()`（常に真）を返す。`Specification` 自体に `null` を返して合成させる書き方は、Spring Data JPA の版によって `where` / `and` の扱いが異なるため使わない。
- 合成に使う API（`Specification.where`、`allOf`、`and` など）は、Spring Boot 4.0.6 が解決する Spring Data JPA の版で存在と挙動を jar またはドキュメントで確かめてから書く（記憶で書かない）。
- JOIN FETCH は件数取得のクエリ（`count`）で使うと失敗するため、`query.getResultType()` が `Long` のときは付けない形にする。本機能はページングしないので件数取得は発生しないが、誤用に備える。

### `ReservationRepository`（変更）

```java
public interface ReservationRepository
    extends JpaRepository<Reservation, UUID>, JpaSpecificationExecutor<Reservation> {
  // 既存メソッドは変更しない
}
```

- 呼び出し：`findAll(spec, Sort.by(Sort.Order.asc("startAt"), Sort.Order.asc("id")))`

## frontend

### CSV 中継 Route Handler（`app/api/reports/reservations/csv/route.ts`）

```ts
export async function GET(request: Request): Promise<Response>;
```

- 入力：`new URL(request.url).searchParams`。`from` / `to` は `get`、`status` は `getAll("status")` で取り出す（`get` では複数選択のうち 1 件しか渡らない）。空文字は除外し、それ以外のキーは捨てる。
- 成功：`new Response(res.body, { status: 200, headers })`。`headers` は backend の `Content-Type`、`Content-Disposition` と `Cache-Control: no-store`。
- 失敗（リダイレクトはいずれも 303、`new URL(path, request.url)`）：
  - `getAccessToken()` が `null`：`/auth/signin`
  - `ApiClientError` で `status === 401`：`/auth/signin`
  - `ApiClientError` でそれ以外：`/admin/reports?error=<code>`（`code` は `ApiClientError.code`。値は `encodeURIComponent` する）
  - `ApiClientError` 以外の例外（通信失敗の `TypeError` など）：`/admin/reports?error=INTERNAL_SERVER_ERROR`

### `api-client.ts`（変更）

```ts
/** GET → Response をそのまま返す（CSV などの非 JSON 用。非 2xx は ApiClientError）。 */
async function getRaw(
  path: string,
  params?: Record<string, string | string[]>,
): Promise<Response>;
```

- 戻り値の `{ get, getPaginated, getArray, post, put, patch, postEmpty }` に `getRaw` を加える。

### 帳票出力ページ（`app/(authenticated)/admin/reports/page.tsx`）

```tsx
export default async function AdminReportsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element>;
```

- `error` の値をメッセージに変換する（`FORBIDDEN` -> 権限がない旨、`VALIDATION_ERROR` -> 条件が不正な旨、それ以外 -> 出力に失敗した旨）。未知の値は「それ以外」として扱い、値そのものは画面に出さない。

### `ReservationCsvExportForm`（`app/(authenticated)/admin/reports/ReservationCsvExportForm.tsx`）

```tsx
"use client";
export function ReservationCsvExportForm(): JSX.Element;
```

- 入力：`<input type="date" name="from">`、`<input type="date" name="to">`、`<input type="checkbox" name="status" value="PENDING|APPROVED|REJECTED|CANCELLED">`。ステータスを 1 つも選ばなければ全ステータスが対象である旨を表示する。
- `onSubmit`：`from` と `to` が両方入力され `from > to`（`YYYY-MM-DD` の文字列比較）なら `preventDefault()` してメッセージを表示する。それ以外は送信をブラウザに任せる。

### `nav-items.ts`（変更）

- `ADMIN_ITEMS` の末尾に `{ label: "帳票出力", href: "/admin/reports" }` を追加する。`navItemsForRole` のシグネチャは変えない。
