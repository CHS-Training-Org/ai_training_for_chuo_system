# Services: CSV 帳票出力（Issue #29）

新規 Service は `ReservationReportService` の 1 つ。既存の `ReservationService` は変えない（帳票は一覧のページング・本人分の制御と要件が異なるため、別の Service に分ける）。

## ReservationReportService

- **Responsibilities**: 予約一覧 CSV 出力のユースケースの調整役。条件の組み立て、取得、CSV 化を 1 つの読み取り専用トランザクションで行う
- **Not responsible for**: 認可（Controller の `@PreAuthorize`）、パラメータの組み合わせ検証（Controller）、HTTP ヘッダ（Controller）、CSV の書式（`ReservationCsvWriter`）

### exportReservationsCsv のオーケストレーション

1. 条件の部品を集める
   - 常に `ReservationSpecifications.fetchResourceAndRequester()`
   - `from` と `to` が非 null なら `startAtFrom(from)` と `startAtBefore(to)`
   - `statuses` が非 null かつ空でなければ `statusIn(statuses)`
2. `Specification.allOf(...)` で AND 結合し、`reservationRepository.findAll(spec, Sort.by("startAt").ascending())` で全件取得する
3. `ReservationCsvWriter.write(reservations)` でバイト列にして返す

LAZY 関連（`resource`、`requester`）は手順 1 の JOIN FETCH で取得済みになり、手順 3 はトランザクション内で実行されるため、`LazyInitializationException` は起きない。

## Frontend の調整役

- `exportReservationsCsvAction`（Server Action）が BFF の調整役。JWT の付与は既存の `createApiClient(getAccessToken)` に任せる
- `CsvExportDialog` は入力と Blob 化だけを担い、バックエンドを直接呼ばない（`coding-conventions.md` の設計原則）
