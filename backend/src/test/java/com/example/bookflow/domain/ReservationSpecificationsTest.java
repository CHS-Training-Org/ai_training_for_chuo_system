package com.example.bookflow.domain;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Persistence;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
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
 * {@link ReservationSpecifications} のテスト（H2 の実クエリで検索条件を検証する）。
 *
 * <p>シードは JDBC で挿入し、テストごとにロールバックされる。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ReservationSpecificationsTest {

  private static final UUID DEPT_ID = UUID.fromString("80000000-0000-0000-0000-000000000001");
  private static final UUID USER_ID = UUID.fromString("80000000-0000-0000-0000-000000000002");
  private static final UUID RESOURCE_ID = UUID.fromString("80000000-0000-0000-0000-000000000003");

  @Autowired private ReservationRepository reservationRepository;
  @Autowired private JdbcTemplate jdbcTemplate;
  @Autowired private EntityManager entityManager;

  @BeforeEach
  void seed() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "仕様テスト部");
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        USER_ID,
        "spec-test-sub",
        "仕様テスト太郎",
        "spec-test@example.com",
        DEPT_ID,
        "MEMBER",
        LocalDateTime.of(2026, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "仕様テスト会議室",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2026, 4, 1, 9, 0));
    // 目的に開始日時を入れて、結果の識別に使う
    insert(1, LocalDateTime.of(2026, 9, 30, 23, 59), "APPROVED");
    insert(2, LocalDateTime.of(2026, 10, 1, 0, 0), "PENDING");
    insert(3, LocalDateTime.of(2026, 10, 15, 10, 0), "APPROVED");
    insert(4, LocalDateTime.of(2026, 10, 31, 23, 59), "REJECTED");
    insert(5, LocalDateTime.of(2026, 11, 1, 0, 0), "CANCELLED");
  }

  private void insert(int n, LocalDateTime startAt, String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        UUID.fromString("80000000-0000-0000-0000-0000000001" + String.format("%02d", n)),
        RESOURCE_ID,
        USER_ID,
        startAt,
        startAt.plusHours(1),
        "予約" + n,
        status,
        LocalDateTime.of(2026, 9, 1, 9, 0),
        LocalDateTime.of(2026, 9, 1, 9, 0));
  }

  private List<String> purposes(Specification<Reservation> spec) {
    return reservationRepository.findAll(spec, Sort.by("startAt", "id")).stream()
        .filter(r -> r.getResource().getId().equals(RESOURCE_ID))
        .map(Reservation::getPurpose)
        .toList();
  }

  private static final LocalDateTime OCT_1 = LocalDateTime.of(2026, 10, 1, 0, 0);
  private static final LocalDateTime NOV_1 = LocalDateTime.of(2026, 11, 1, 0, 0);

  @Test
  void forReport_noConditions_returnsAllSortedByStartAt() {
    assertThat(purposes(ReservationSpecifications.forReport(null, null, null)))
        .containsExactly("予約1", "予約2", "予約3", "予約4", "予約5");
  }

  @Test
  void forReport_fromIsInclusive() {
    assertThat(purposes(ReservationSpecifications.forReport(OCT_1, null, null)))
        .containsExactly("予約2", "予約3", "予約4", "予約5");
  }

  @Test
  void forReport_toExclusiveBoundary_excludesNextDayMidnight() {
    assertThat(purposes(ReservationSpecifications.forReport(null, NOV_1, null)))
        .containsExactly("予約1", "予約2", "予約3", "予約4");
  }

  @Test
  void forReport_fromAndTo_returnsOctoberOnly() {
    assertThat(purposes(ReservationSpecifications.forReport(OCT_1, NOV_1, null)))
        .containsExactly("予約2", "予約3", "予約4");
  }

  @Test
  void forReport_singleStatus_filters() {
    assertThat(
            purposes(
                ReservationSpecifications.forReport(
                    null, null, List.of(ReservationStatus.APPROVED))))
        .containsExactly("予約1", "予約3");
  }

  @Test
  void forReport_multipleStatuses_matchesAny() {
    assertThat(
            purposes(
                ReservationSpecifications.forReport(
                    null, null, List.of(ReservationStatus.PENDING, ReservationStatus.REJECTED))))
        .containsExactly("予約2", "予約4");
  }

  @Test
  void forReport_emptyStatuses_meansNoStatusCondition() {
    assertThat(purposes(ReservationSpecifications.forReport(null, null, List.of()))).hasSize(5);
  }

  @Test
  void forReport_periodAndStatus_areCombinedWithAnd() {
    assertThat(
            purposes(
                ReservationSpecifications.forReport(
                    OCT_1, NOV_1, List.of(ReservationStatus.APPROVED))))
        .containsExactly("予約3");
  }

  @Test
  void forReport_fetchesAssociations_loadsResourceAndRequesterEagerly() {
    // 永続化コンテキストを空にし、クエリ自身が関連を取得したかだけを見る
    entityManager.flush();
    entityManager.clear();

    Reservation r =
        reservationRepository
            .findAll(ReservationSpecifications.forReport(OCT_1, NOV_1, null), Sort.by("startAt"))
            .stream()
            .filter(x -> x.getPurpose().equals("予約2"))
            .findFirst()
            .orElseThrow();

    // 同一セッション内では遅延読み込みでも値は取れるため、初期化済みかどうかで判定する
    var persistenceUtil = Persistence.getPersistenceUtil();
    assertThat(persistenceUtil.isLoaded(r, "resource")).isTrue();
    assertThat(persistenceUtil.isLoaded(r, "requester")).isTrue();
  }
}
