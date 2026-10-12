# Domain Entities — usage-report

## 変更の概要

- **DB・エンティティの変更なし**：`reservations`・`resources` テーブル、`Reservation`・`Resource` エンティティ、マイグレーションは変更しない（読み取りのみ）
- **新規クラス**：`StatisticsController`・`StatisticsService`・`UsageCalculator`・`UsageCondition`・`ResourceUsageResponse`・`ApprovedUsage`
- **既存への変更**：`ReservationRepository` にクエリを 2 つ追加するのみ（`ResourceRepository` は変更しない。`findAll()` を使う）

パス略記：`B/` = `backend/src/main/java/com/example/bookflow/`。

## 新規

### `B/domain/ApprovedUsage.java`（record、JPQL の射影）

```java
public record ApprovedUsage(UUID resourceId, LocalDateTime startAt, LocalDateTime endAt) {}
```

集計に必要な最小の値だけを持つ。JPQL の構築子式（`SELECT new com.example.bookflow.domain.ApprovedUsage(...)`）で生成する。

### `B/presentation/dto/UsageCondition.java`（record）

```java
public record UsageCondition(LocalDateTime from, LocalDateTime to) {

  /** 期間条件が指定されているか（from と to が両方ある）。 */
  public boolean hasPeriod() {
    return from != null && to != null;
  }
}
```

### `B/presentation/dto/ResourceUsageResponse.java`（record）

```java
public record ResourceUsageResponse(
    UUID resourceId, String resourceName, long reservationCount, long totalMinutes) {}
```

### `B/application/UsageCalculator.java`（純粋関数）

```java
final class UsageCalculator {
  private UsageCalculator() {}

  /** 予約の時間を、期間（null なら無制限）で切り詰めた秒で返す。負は 0。 */
  static long clippedSeconds(
      LocalDateTime startAt, LocalDateTime endAt, LocalDateTime from, LocalDateTime to) { ... }
}
```

引数は 4 つ（Checkstyle の `ParameterNumber` 最大 7 以内）。`public` にせず、同じパッケージの `StatisticsService` とテストから使う。

### `B/application/StatisticsService.java`

```java
@Service
public class StatisticsService {
  public StatisticsService(
      ReservationRepository reservationRepository, ResourceRepository resourceRepository) { ... }

  @Transactional(readOnly = true)
  public List<ResourceUsageResponse> aggregate(UsageCondition condition) { ... }
}
```

- private：集計値を持つ小さな内部クラス（件数と秒の合計）、並べ替えの `Comparator`
- 規則は BR-04〜BR-10

### `B/presentation/StatisticsController.java`

```java
@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {
  @GetMapping("/resources")
  @PreAuthorize("hasRole('ADMIN')")
  public List<ResourceUsageResponse> resources(
      @RequestParam(required = false) LocalDateTime from,
      @RequestParam(required = false) LocalDateTime to) { ... }
}
```

- 検証（BR-02・BR-03）→ `UsageCondition` 生成 → `StatisticsService.aggregate`
- `@CurrentUser` は不要（ロールは `@PreAuthorize` で判定済みで、ADMIN は全件対象）

## 既存への変更

### `B/domain/ReservationRepository.java`（追加 2 メソッド）

```java
@Query(
    "SELECT new com.example.bookflow.domain.ApprovedUsage(r.resource.id, r.startAt, r.endAt)"
        + " FROM Reservation r WHERE r.status = :status")
List<ApprovedUsage> findApprovedUsage(@Param("status") ReservationStatus status);

@Query(
    "SELECT new com.example.bookflow.domain.ApprovedUsage(r.resource.id, r.startAt, r.endAt)"
        + " FROM Reservation r WHERE r.status = :status AND "
        + PERIOD_MATCH)
List<ApprovedUsage> findApprovedUsageByPeriod(
    @Param("status") ReservationStatus status,
    @Param("from") LocalDateTime from,
    @Param("to") LocalDateTime to);
```

- `PERIOD_MATCH` は同インターフェースの既存定数（`r.startAt < :to AND r.endAt > :from`）を使う。定数の宣言より後ろに追加する（`findAllForReportBy*` の後ろ）
- `r.resource.id` は外部キーの参照のみで結合しない。ページングなしで `List` を返す（件数上限なし、要件）

## 影響を受けない既存実装

- `ReservationService`・`ReservationController`・`ReservationReportService`・`ReportController`（変更なし）
- `ResourceRepository`・`ResourceService`（`findAll()` を呼ぶだけで変更なし）
- `SecurityConfig`（ロール別の `requestMatchers` は元々なく、`@PreAuthorize` で制御するため変更不要）、`GlobalExceptionHandler`（401・403・400 は既存ハンドラがそのまま返す）
