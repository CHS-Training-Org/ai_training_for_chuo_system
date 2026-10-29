# Component Methods

業務ルールの詳細は `requirements.md`（RPT-01〜18）が正。ここではシグネチャと目的のみを示す。

## ReportController
| メソッド | 目的 |
|---|---|
| `ResponseEntity<byte[]> exportReservationsCsv(List<ReservationStatus> status, LocalDate from, LocalDate to)` | CSV を返す。`status` は任意、`from`・`to` は `@DateTimeFormat(iso = DATE)` で任意。`from > to` なら `ValidationException`（400） |
| `static String buildFileName(LocalDate from, LocalDate to, LocalDate today)` | 両端があれば `reservations_yyyyMMdd_yyyyMMdd.csv`、なければ `reservations_yyyyMMdd.csv`（出力日） |

## ReportService
| メソッド | 目的 |
|---|---|
| `byte[] exportReservationsCsv(LocalDate from, LocalDate to, Collection<ReservationStatus> statuses)` | 範囲変換、検索、行変換、CSV 化を行う。`@Transactional(readOnly = true)` |

## ReservationCsvWriter
| メソッド | 目的 |
|---|---|
| `byte[] write(List<ReservationCsvRow> rows)` | BOM、ヘッダ、全行を書き出す。0 件でもヘッダ行は出す |
| `static String escape(String value)` | 数式対策（先頭の `'` 付与）の後、RFC 4180 の引用符処理を行う |
| `static String statusLabel(ReservationStatus status)` | 日本語ラベル（承認待ち、承認済み、却下、キャンセル済み、ドラフト。画面の `RESERVATION_STATUS_LABELS` と同じ） |

## ReservationCsvRow（record）
`UUID id`、`String resourceName`、`String requesterName`、`LocalDateTime startAt`、`LocalDateTime endAt`、`String purpose`、`ReservationStatus status`

## ReservationSpecifications
| メソッド | 目的 |
|---|---|
| `static Specification<Reservation> startAtFrom(LocalDateTime from)` | `start_at >= from`。null なら条件なし |
| `static Specification<Reservation> startAtBefore(LocalDateTime toExclusive)` | `start_at < toExclusive`。null なら条件なし |
| `static Specification<Reservation> statusIn(Collection<ReservationStatus> statuses)` | 空または null なら条件なし |
| `static Specification<Reservation> forReport(LocalDateTime from, LocalDateTime toExclusive, Collection<ReservationStatus> statuses)` | 上記を AND で合成し、`resource` と `requester` を fetch join する |

## ReservationRepository（継承の追加）
`JpaSpecificationExecutor<Reservation>` の `List<Reservation> findAll(Specification<Reservation>, Sort)` を使う。並び順は `startAt` 昇順、`id` 昇順。

## Frontend
| 対象 | シグネチャと目的 |
|---|---|
| `route.ts` | `export async function GET(request: Request): Promise<Response>`。クエリを転送し、成功時は CSV を、失敗時は `{ code, message }` と元のステータスを返す |
| `api-client.ts` | `getRaw(path, params?): Promise<Response>`。非 2xx は既存どおり `ApiClientError` |
| `ReservationReportForm` | 引数なしのクライアントコンポーネント。送信時に URL を組み立てて `fetch` し、Blob をダウンロードする |
| `nav-items.ts` | `ADMIN_ITEMS` に `{ label: "予約帳票", href: "/admin/reservations" }` を追加 |
