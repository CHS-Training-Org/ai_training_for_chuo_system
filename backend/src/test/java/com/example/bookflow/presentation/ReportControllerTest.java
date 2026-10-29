package com.example.bookflow.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
import com.example.bookflow.support.WithMockApprover;
import com.example.bookflow.support.WithMockMember;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

/**
 * {@link ReportController} 結合テスト（api-spec.md §帳票出力 準拠）。
 *
 * <p>ADMIN のみが CSV を取得でき、MEMBER / APPROVER は 403、未認証は 401 になることと、期間・ステータスの絞り込み、 不正なパラメータの 400
 * を確認する。{@code @WithMock*} のデフォルト sub を持つユーザーも {@code RegisteredUserInterceptor} のためにシードする。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReportControllerTest extends BaseControllerTest {

  // ---- テスト用固定 ID（81xxxxxx プレフィックスで他テストと分離）----
  private static final UUID DEPT_ID = UUID.fromString("81000000-0000-0000-0000-000000000001");
  private static final UUID ADMIN_ID = UUID.fromString("81000000-0000-0000-0000-000000000002");
  private static final UUID MEMBER_ID = UUID.fromString("81000000-0000-0000-0000-000000000003");
  private static final UUID APPROVER_ID = UUID.fromString("81000000-0000-0000-0000-000000000004");
  private static final UUID RESOURCE_ID = UUID.fromString("81000000-0000-0000-0000-000000000010");
  private static final UUID RES_OCT_APPROVED =
      UUID.fromString("81000000-0000-0000-0000-000000000021");
  private static final UUID RES_OCT_PENDING =
      UUID.fromString("81000000-0000-0000-0000-000000000022");
  private static final UUID RES_NOV_APPROVED =
      UUID.fromString("81000000-0000-0000-0000-000000000023");

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void seed() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "帳票テスト部");
    insertUser(ADMIN_ID, "test-admin-sub", "管理者 花子", "report-admin@example.com", "ADMIN");
    insertUser(MEMBER_ID, "test-member-sub", "一般 太郎", "report-member@example.com", "MEMBER");
    insertUser(
        APPROVER_ID, "test-approver-sub", "承認 次郎", "report-approver@example.com", "APPROVER");
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "帳票会議室",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2026, 4, 1, 9, 0));
    insertReservation(
        RES_OCT_APPROVED, LocalDateTime.of(2026, 10, 2, 10, 0), "10月の確定予約", "APPROVED");
    insertReservation(
        RES_OCT_PENDING, LocalDateTime.of(2026, 10, 20, 13, 0), "=10月の承認待ち", "PENDING");
    insertReservation(
        RES_NOV_APPROVED, LocalDateTime.of(2026, 11, 5, 9, 0), "11月の確定予約", "APPROVED");
  }

  private void insertUser(UUID id, String sub, String name, String email, String role) {
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        id,
        sub,
        name,
        email,
        DEPT_ID,
        role,
        LocalDateTime.of(2026, 4, 1, 9, 0));
  }

  private void insertReservation(UUID id, LocalDateTime startAt, String purpose, String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        MEMBER_ID,
        startAt,
        startAt.plusHours(2),
        purpose,
        status,
        LocalDateTime.of(2026, 9, 1, 9, 0),
        LocalDateTime.of(2026, 9, 1, 9, 0));
  }

  @AfterEach
  void deleteSeed() {
    jdbcTemplate.update("DELETE FROM reservations WHERE resource_id = ?", RESOURCE_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", RESOURCE_ID);
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?)", ADMIN_ID, MEMBER_ID, APPROVER_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  private String csv(MvcResult result) throws Exception {
    return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
  }

  // ---------------------------------------------------------------------------
  // 認可
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportReservationsCsv_admin_returns200WithCsvHeaders() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv"))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "text/csv;charset=UTF-8"))
        .andExpect(
            header()
                .string(
                    "Content-Disposition",
                    "attachment; filename=\"reservations_"
                        + java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")
                            .format(LocalDate.now())
                        + ".csv\""));
  }

  @Test
  @WithMockMember
  void exportReservationsCsv_member_returns403() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void exportReservationsCsv_approver_returns403() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void exportReservationsCsv_unauthenticated_returns401() throws Exception {
    mockMvc.perform(get("/api/reports/reservations/csv")).andExpect(status().isUnauthorized());
  }

  // ---------------------------------------------------------------------------
  // 内容と絞り込み
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportReservationsCsv_noFilter_containsHeaderBomAndAllSeededRows() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get("/api/reports/reservations/csv"))
            .andExpect(status().isOk())
            .andReturn();

    String body = csv(result);
    assertThat(body).startsWith("﻿予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態\r\n");
    assertThat(body)
        .contains(RES_OCT_APPROVED + ",帳票会議室,一般 太郎,2026-10-02 10:00,2026-10-02 12:00,10月の確定予約,承認済み")
        .contains("'=10月の承認待ち,承認待ち")
        .contains("11月の確定予約");
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_period_returnsOnlyReservationsStartingInRange() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                get("/api/reports/reservations/csv")
                    .param("from", "2026-10-01")
                    .param("to", "2026-10-31"))
            .andExpect(status().isOk())
            .andExpect(
                header()
                    .string(
                        "Content-Disposition",
                        "attachment; filename=\"reservations_20261001_20261031.csv\""))
            .andReturn();

    String body = csv(result);
    assertThat(body).contains("10月の確定予約").contains("10月の承認待ち").doesNotContain("11月の確定予約");
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_toDateIsInclusive() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get("/api/reports/reservations/csv").param("to", "2026-10-02"))
            .andExpect(status().isOk())
            .andReturn();

    String body = csv(result);
    assertThat(body).contains("10月の確定予約").doesNotContain("10月の承認待ち");
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_multipleStatuses_filtersByAny() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                get("/api/reports/reservations/csv")
                    .param("status", "PENDING")
                    .param("status", "REJECTED"))
            .andExpect(status().isOk())
            .andReturn();

    String body = csv(result);
    assertThat(body).contains("10月の承認待ち").doesNotContain("10月の確定予約");
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_noMatches_returns200WithHeaderOnly() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                get("/api/reports/reservations/csv")
                    .param("from", "2030-01-01")
                    .param("to", "2030-01-31"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(csv(result)).isEqualTo("﻿予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態\r\n");
  }

  // ---------------------------------------------------------------------------
  // 入力検証
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportReservationsCsv_rows_areOrderedByStartAtThenId() throws Exception {
    // 挿入順を「並び順と逆」にして、DB の自然順では通らないようにする
    UUID sameStartLargeId = UUID.fromString("81000000-0000-0000-0000-000000000042");
    UUID sameStartSmallId = UUID.fromString("81000000-0000-0000-0000-000000000041");
    UUID earliest = UUID.fromString("81000000-0000-0000-0000-000000000043");
    LocalDateTime sameStart = LocalDateTime.of(2026, 9, 15, 10, 0);
    insertReservation(sameStartLargeId, sameStart, "同時刻IDの大", "APPROVED");
    insertReservation(sameStartSmallId, sameStart, "同時刻IDの小", "APPROVED");
    insertReservation(earliest, LocalDateTime.of(2026, 9, 1, 8, 0), "最も早い予約", "APPROVED");

    MvcResult result =
        mockMvc
            .perform(get("/api/reports/reservations/csv"))
            .andExpect(status().isOk())
            .andReturn();

    String body = csv(result);
    java.util.List<String> expectedOrder =
        java.util.List.of("最も早い予約", "同時刻IDの小", "同時刻IDの大", "10月の確定予約", "10月の承認待ち", "11月の確定予約");
    java.util.List<Integer> positions = expectedOrder.stream().map(body::indexOf).toList();
    assertThat(positions).doesNotContain(-1).isSorted();
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_fromAfterTo_returns400() throws Exception {
    mockMvc
        .perform(
            get("/api/reports/reservations/csv")
                .param("from", "2026-10-31")
                .param("to", "2026-10-01"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_invalidDate_returns400() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv").param("from", "2026-13-45"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    mockMvc
        .perform(get("/api/reports/reservations/csv").param("to", "2026-10-01T10:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_unknownStatus_returns400() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv").param("status", "UNKNOWN"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  // ---------------------------------------------------------------------------
  // ファイル名
  // ---------------------------------------------------------------------------

  @Test
  void buildFileName_bothDates_usesPeriod() {
    assertThat(
            ReportController.buildFileName(
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 29)))
        .isEqualTo("reservations_20261001_20261031.csv");
  }

  @Test
  void buildFileName_oneOrNoDate_usesToday() {
    LocalDate today = LocalDate.of(2026, 10, 29);
    assertThat(ReportController.buildFileName(LocalDate.of(2026, 10, 1), null, today))
        .isEqualTo("reservations_20261029.csv");
    assertThat(ReportController.buildFileName(null, LocalDate.of(2026, 10, 31), today))
        .isEqualTo("reservations_20261029.csv");
    assertThat(ReportController.buildFileName(null, null, today))
        .isEqualTo("reservations_20261029.csv");
  }
}
