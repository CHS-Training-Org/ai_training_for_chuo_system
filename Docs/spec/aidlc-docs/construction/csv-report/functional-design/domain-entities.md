# Domain Entities — csv-report

## 変更の概要

- **DB・エンティティの変更なし**：`reservations` テーブル、`Reservation`・`Resource`・`User` エンティティ、マイグレーションは変更しない（読み取りのみ）
- **新規クラス**：`ReportController`・`ReservationReportService`・`CsvWriter`・`ReportCondition`
- **既存への変更**：`ReservationRepository` にクエリを 2 つ追加するのみ

パス略記：`B/` = `backend/src/main/java/com/example/bookflow/`。

## 新規

### `B/presentation/dto/ReportCondition.java`（record）

```java
public record ReportCondition(
    LocalDateTime from, LocalDateTime to, List<ReservationStatus> statuses) {

  /** from と to が両方指定されているか（Controller で同時指定を検証済みの前提）。 */
  public boolean hasPeriod() {
    return from != null && to != null;
  }
}
```

`statuses` は未指定のとき `null` または空。有効な値の決定は Service が行う。パラメータ数の制約（Checkstyle の `ParameterNumber` 最大 7）に収めるため、条件を 1 つにまとめる。

### `B/application/csv/CsvWriter.java`

```java
public final class CsvWriter {
  public static byte[] toBytes(List<String> header, List<List<String>> rows) { ... }
  static String escape(String cell) { ... }   // 数式無害化 → RFC 4180（パッケージ内でテスト）
}
```

- 定数：`UTF8_BOM`（`byte[]{(byte)0xEF,(byte)0xBB,(byte)0xBF}`）、`CRLF`（`"\r\n"`）
- インスタンス化しない（`private` コンストラクタ）。`null` セルは空文字として扱う
- 規則は BR-08・BR-09・BR-10

### `B/application/ReservationReportService.java`

```java
@Service
public class ReservationReportService {
  public ReservationReportService(ReservationRepository reservationRepository) { ... }

  @Transactional(readOnly = true)
  public byte[] exportCsv(ReportCondition condition) { ... }
}
```

- 定数：`HEADER`（`List.of("予約ID", "リソース名", "申請者名", "開始日時", "終了日時", "目的", "承認状態")`）、`DEFAULT_STATUSES`（`PENDING`・`APPROVED`・`REJECTED`・`CANCELLED`）、`DATE_TIME_FORMAT`（`yyyy-MM-dd HH:mm`）
- private：`statusLabel(ReservationStatus)`（`switch` 式で全値を網羅、BR-07）、`toRow(Reservation)`（BR-07）

### `B/presentation/ReportController.java`

```java
@RestController
@RequestMapping("/api/reports")
public class ReportController {
  @GetMapping("/reservations/csv")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> reservationsCsv(
      @RequestParam(required = false) List<ReservationStatus> status,
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to) { ... }
}
```

- `from`/`to` の同時指定チェック（BR-02）→ `ReportCondition` 生成 → `exportCsv` → `ResponseEntity`
- ヘッダ：`MediaType("text", "csv", StandardCharsets.UTF_8)`、`ContentDisposition.attachment().filename("reservations_" + yyyyMMdd + ".csv").build()`、`Cache-Control: no-store`（BR-11）
- `@CurrentUser` は不要（ロールは `@PreAuthorize` で判定済みで、ADMIN は全件対象）

## 既存への変更

### `B/domain/ReservationRepository.java`（追加 2 メソッド）

```java
@Query(
    "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
        + " WHERE r.status IN :statuses ORDER BY r.startAt ASC, r.id ASC")
List<Reservation> findAllForReportByStatusIn(
    @Param("statuses") Collection<ReservationStatus> statuses);

@Query(
    "SELECT r FROM Reservation r JOIN FETCH r.resource JOIN FETCH r.requester"
        + " WHERE r.status IN :statuses AND " + PERIOD_MATCH
        + " ORDER BY r.startAt ASC, r.id ASC")
List<Reservation> findAllForReportByPeriodAndStatusIn(
    @Param("from") LocalDateTime from,
    @Param("to") LocalDateTime to,
    @Param("statuses") Collection<ReservationStatus> statuses);
```

- `PERIOD_MATCH` は同インターフェースの既存定数（`r.startAt < :to AND r.endAt > :from`）を使う。定数はクエリ定義より前（既存では 132 行目付近）に宣言されているため、追加位置はその後ろにする
- ページングなしで `List` を返す（件数上限なし、要件の決定事項 5）

## 影響を受けない既存実装

- `ReservationService`・`ReservationController` とその一覧用の 16 通りのクエリ（変更なし）
- `SecurityConfig`（ロール別の `requestMatchers` は元々なく、`@PreAuthorize` で制御するため変更不要）
- `GlobalExceptionHandler`（401・403・400 は既存ハンドラがそのまま返す）
