package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link ReservationSpecifications} の検索条件テスト（実クエリ・H2）。
 *
 * <p>{@code @DataJpaTest} は現行の依存関係に含まれないため、{@link ResourceRepositoryTest} と同じ
 * {@code @SpringBootTest} + {@code test} プロファイルを使う。各テストはロールバックされる（{@link JdbcTemplate} は JPA
 * と同じトランザクションの接続を使う）。
 *
 * <p>テスト用 H2 は同じ JVM のほかのテストクラスと共有され、後始末されない行が残りうる。そのため絶対件数は検証せず、 このクラスが投入した予約の ID だけを取り出して検証する。
 * テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ReservationSpecificationsTest {

  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 1, 1, 0, 0);

  private static final LocalDateTime FROM = LocalDateTime.of(2026, 6, 1, 0, 0);
  private static final LocalDateTime TO = LocalDateTime.of(2026, 7, 1, 0, 0);

  @Autowired private ReservationRepository reservationRepository;
  @Autowired private JdbcTemplate jdbcTemplate;

  private final List<UUID> mine = new ArrayList<>();
  private UUID resourceId;
  private UUID userId;

  @BeforeEach
  void seedBase() {
    UUID deptId = UUID.randomUUID();
    userId = UUID.randomUUID();
    resourceId = UUID.randomUUID();
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", deptId, "ZZ-REPORT-部署");
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        userId,
        "zz-report-sub-" + userId,
        "ZZ-REPORT-申請者",
        "zz-report-" + userId + "@example.com",
        deptId,
        "MEMBER",
        CREATED_AT);
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        resourceId,
        "ZZ-REPORT-会議室",
        "ROOM",
        false,
        true,
        CREATED_AT);
  }

  // ---------------------------------------------------------------------------
  // ヘルパー
  // ---------------------------------------------------------------------------

  private UUID insert(LocalDateTime startAt, LocalDateTime endAt, String status) {
    UUID id = UUID.randomUUID();
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        resourceId,
        userId,
        startAt,
        endAt,
        "ZZ-REPORT-目的",
        status,
        CREATED_AT,
        CREATED_AT);
    mine.add(id);
    return id;
  }

  private UUID insertAt(LocalDateTime startAt, String status) {
    return insert(startAt, startAt.plusHours(1), status);
  }

  /** 条件で全件取得し、このテストが投入した予約の ID だけを（開始日時の昇順のまま）返す。 */
  private List<UUID> find(List<Specification<Reservation>> conditions) {
    List<Specification<Reservation>> all = new ArrayList<>(conditions);
    all.add(ReservationSpecifications.fetchResourceAndRequester());
    return reservationRepository
        .findAll(Specification.allOf(all), Sort.by("startAt").ascending())
        .stream()
        .map(Reservation::getId)
        .filter(mine::contains)
        .toList();
  }

  private List<Specification<Reservation>> period() {
    return List.of(
        ReservationSpecifications.startAtFrom(FROM), ReservationSpecifications.startAtBefore(TO));
  }

  // ---------------------------------------------------------------------------
  // 期間（開始日時で判定・from 含む / to 含まない）
  // ---------------------------------------------------------------------------

  @Test
  void period_boundaries_includesFromAndExcludesTo() {
    UUID beforeFrom = insertAt(LocalDateTime.of(2026, 5, 31, 23, 0), "APPROVED");
    UUID atFrom = insertAt(LocalDateTime.of(2026, 6, 1, 0, 0), "APPROVED");
    UUID beforeTo = insertAt(LocalDateTime.of(2026, 6, 30, 23, 0), "APPROVED");
    UUID atTo = insertAt(LocalDateTime.of(2026, 7, 1, 0, 0), "APPROVED");

    List<UUID> ids = find(period());

    assertThat(ids).containsExactly(atFrom, beforeTo);
    assertThat(ids).doesNotContain(beforeFrom, atTo);
  }

  @Test
  void period_reservationStartingBeforeFromAndEndingInside_isExcluded() {
    UUID carryOver =
        insert(
            LocalDateTime.of(2026, 5, 31, 22, 0), LocalDateTime.of(2026, 6, 1, 2, 0), "APPROVED");

    assertThat(find(period())).doesNotContain(carryOver);
  }

  // ---------------------------------------------------------------------------
  // ステータス
  // ---------------------------------------------------------------------------

  @Test
  void statusIn_singleStatus_returnsOnlyThatStatus() {
    UUID pending = insertAt(LocalDateTime.of(2026, 6, 1, 9, 0), "PENDING");
    UUID approved = insertAt(LocalDateTime.of(2026, 6, 2, 9, 0), "APPROVED");
    UUID rejected = insertAt(LocalDateTime.of(2026, 6, 3, 9, 0), "REJECTED");
    UUID cancelled = insertAt(LocalDateTime.of(2026, 6, 4, 9, 0), "CANCELLED");

    List<UUID> ids =
        find(List.of(ReservationSpecifications.statusIn(List.of(ReservationStatus.APPROVED))));

    assertThat(ids).containsExactly(approved);
    assertThat(ids).doesNotContain(pending, rejected, cancelled);
  }

  @Test
  void statusIn_multipleStatuses_returnsAnyOfThem() {
    UUID pending = insertAt(LocalDateTime.of(2026, 6, 1, 9, 0), "PENDING");
    UUID approved = insertAt(LocalDateTime.of(2026, 6, 2, 9, 0), "APPROVED");
    UUID rejected = insertAt(LocalDateTime.of(2026, 6, 3, 9, 0), "REJECTED");

    List<UUID> ids =
        find(
            List.of(
                ReservationSpecifications.statusIn(
                    List.of(ReservationStatus.PENDING, ReservationStatus.APPROVED))));

    assertThat(ids).containsExactly(pending, approved);
    assertThat(ids).doesNotContain(rejected);
  }

  @Test
  void periodAndStatus_combined_returnsOnlyReservationsSatisfyingBoth() {
    UUID inPeriodApproved = insertAt(LocalDateTime.of(2026, 6, 10, 9, 0), "APPROVED");
    UUID inPeriodPending = insertAt(LocalDateTime.of(2026, 6, 11, 9, 0), "PENDING");
    UUID outPeriodApproved = insertAt(LocalDateTime.of(2026, 8, 1, 9, 0), "APPROVED");
    List<Specification<Reservation>> conditions = new ArrayList<>(period());
    conditions.add(ReservationSpecifications.statusIn(List.of(ReservationStatus.APPROVED)));

    List<UUID> ids = find(conditions);

    assertThat(ids).containsExactly(inPeriodApproved);
    assertThat(ids).doesNotContain(inPeriodPending, outPeriodApproved);
  }

  // ---------------------------------------------------------------------------
  // 条件なし・並び順・JOIN FETCH
  // ---------------------------------------------------------------------------

  @Test
  void noConditions_returnsAllStatusesSortedByStartAtAscending() {
    // 投入順をわざと開始日時の降順にする
    UUID cancelled = insertAt(LocalDateTime.of(2026, 9, 1, 9, 0), "CANCELLED");
    UUID rejected = insertAt(LocalDateTime.of(2026, 8, 1, 9, 0), "REJECTED");
    UUID approved = insertAt(LocalDateTime.of(2026, 7, 1, 9, 0), "APPROVED");
    UUID pending = insertAt(LocalDateTime.of(2026, 6, 1, 9, 0), "PENDING");
    UUID draft = insertAt(LocalDateTime.of(2026, 5, 1, 9, 0), "DRAFT");

    List<UUID> ids = find(List.of());

    assertThat(ids).containsExactly(draft, pending, approved, rejected, cancelled);
  }

  @Test
  void fetchResourceAndRequester_loadsAssociationsEagerly() {
    insertAt(LocalDateTime.of(2026, 6, 1, 9, 0), "APPROVED");

    List<Reservation> loaded =
        reservationRepository
            .findAll(
                Specification.allOf(ReservationSpecifications.fetchResourceAndRequester()),
                Sort.by("startAt").ascending())
            .stream()
            .filter(r -> mine.contains(r.getId()))
            .toList();

    assertThat(loaded).hasSize(1);
    assertThat(Hibernate.isInitialized(loaded.get(0).getResource())).isTrue();
    assertThat(Hibernate.isInitialized(loaded.get(0).getRequester())).isTrue();
    assertThat(loaded.get(0).getResource().getName()).isEqualTo("ZZ-REPORT-会議室");
    assertThat(loaded.get(0).getRequester().getName()).isEqualTo("ZZ-REPORT-申請者");
  }
}
