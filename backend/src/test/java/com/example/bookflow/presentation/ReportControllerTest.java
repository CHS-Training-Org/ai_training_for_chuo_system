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
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * {@link ReportController} 結合テスト（api-spec.md §帳票出力 準拠）。
 *
 * <p>ADMIN のみが {@code GET /api/reports/reservations/csv} を呼べること、CSV の形式、期間・ステータスの絞り込み、400 の検証を確認する。
 *
 * <p>テスト用 H2 は同じ JVM のほかのテストクラスと共有されるため、応答全体の行数は検証せず、このクラスが投入した予約の ID が 応答に含まれる・含まれないことで検証する。
 * {@link com.example.bookflow.infrastructure.security.RegisteredUserInterceptor}
 * のため、{@code @WithMock*} の既定 sub に対応するユーザーもシードする（{@link UserControllerTest} と同じ）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReportControllerTest extends BaseControllerTest {

  private static final String URL = "/api/reports/reservations/csv";
  private static final String HEADER = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";
  private static final String BOM = "﻿";

  // ---- テスト用固定 ID（29xxxxxx プレフィックスで他テストと分離）----
  private static final UUID DEPT_ID = UUID.fromString("29000000-0000-0000-0000-000000000001");
  private static final UUID ADMIN_AUTH_ID = UUID.fromString("29000000-0000-0000-0000-000000000002");
  private static final UUID MEMBER_AUTH_ID =
      UUID.fromString("29000000-0000-0000-0000-000000000003");
  private static final UUID APPROVER_AUTH_ID =
      UUID.fromString("29000000-0000-0000-0000-000000000004");
  private static final UUID REQUESTER_ID = UUID.fromString("29000000-0000-0000-0000-000000000005");
  private static final UUID RESOURCE_ID = UUID.fromString("29000000-0000-0000-0000-000000000006");

  // ---- 予約（開始日時を変えて期間・ステータスの判定を確認する）----
  private static final UUID R_BEFORE_FROM = UUID.fromString("29000000-0000-0000-0000-0000000000a1");
  private static final UUID R_AT_FROM = UUID.fromString("29000000-0000-0000-0000-0000000000a2");
  private static final UUID R_BEFORE_TO = UUID.fromString("29000000-0000-0000-0000-0000000000a3");
  private static final UUID R_AT_TO = UUID.fromString("29000000-0000-0000-0000-0000000000a4");
  private static final UUID R_CARRY_OVER = UUID.fromString("29000000-0000-0000-0000-0000000000a5");
  private static final UUID R_PENDING = UUID.fromString("29000000-0000-0000-0000-0000000000b1");
  private static final UUID R_REJECTED = UUID.fromString("29000000-0000-0000-0000-0000000000b2");
  private static final UUID R_CANCELLED = UUID.fromString("29000000-0000-0000-0000-0000000000b3");
  private static final UUID R_ESCAPE = UUID.fromString("29000000-0000-0000-0000-0000000000c1");

  private static final List<UUID> ALL_RESERVATIONS =
      List.of(
          R_BEFORE_FROM,
          R_AT_FROM,
          R_BEFORE_TO,
          R_AT_TO,
          R_CARRY_OVER,
          R_PENDING,
          R_REJECTED,
          R_CANCELLED,
          R_ESCAPE);

  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 1, 1, 0, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "帳票テスト部署");
    insertUser(ADMIN_AUTH_ID, "test-admin-sub", "テスト管理者", "ADMIN");
    insertUser(MEMBER_AUTH_ID, "test-member-sub", "テスト会員", "MEMBER");
    insertUser(APPROVER_AUTH_ID, "test-approver-sub", "テスト承認者", "APPROVER");
    insertUser(REQUESTER_ID, "zz-csv-requester-sub", "帳票申請者", "MEMBER");
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "帳票会議室",
        "ROOM",
        false,
        true,
        CREATED_AT);

    // 期間 [2026-06-01T00:00, 2026-07-01T00:00) の境界（すべて APPROVED）
    insertReservation(
        R_BEFORE_FROM,
        LocalDateTime.of(2026, 5, 31, 23, 0),
        LocalDateTime.of(2026, 5, 31, 23, 30),
        "ZZ-CSV-前日",
        "APPROVED");
    insertReservation(
        R_AT_FROM,
        LocalDateTime.of(2026, 6, 1, 0, 0),
        LocalDateTime.of(2026, 6, 1, 1, 0),
        "ZZ-CSV-期間開始ちょうど",
        "APPROVED");
    insertReservation(
        R_BEFORE_TO,
        LocalDateTime.of(2026, 6, 30, 23, 0),
        LocalDateTime.of(2026, 6, 30, 23, 30),
        "ZZ-CSV-期間終了の直前",
        "APPROVED");
    insertReservation(
        R_AT_TO,
        LocalDateTime.of(2026, 7, 1, 0, 0),
        LocalDateTime.of(2026, 7, 1, 1, 0),
        "ZZ-CSV-期間終了ちょうど",
        "APPROVED");
    // 期間の前から続く予約（開始 05-31 22:00、終了 06-01 02:00）
    insertReservation(
        R_CARRY_OVER,
        LocalDateTime.of(2026, 5, 31, 22, 0),
        LocalDateTime.of(2026, 6, 1, 2, 0),
        "ZZ-CSV-期間をまたぐ",
        "APPROVED");
    // ステータス違い（期間内）
    insertReservation(
        R_PENDING,
        LocalDateTime.of(2026, 6, 10, 10, 0),
        LocalDateTime.of(2026, 6, 10, 11, 0),
        "ZZ-CSV-承認待ち",
        "PENDING");
    insertReservation(
        R_REJECTED,
        LocalDateTime.of(2026, 6, 11, 10, 0),
        LocalDateTime.of(2026, 6, 11, 11, 0),
        "ZZ-CSV-却下",
        "REJECTED");
    insertReservation(
        R_CANCELLED,
        LocalDateTime.of(2026, 6, 12, 10, 0),
        LocalDateTime.of(2026, 6, 12, 11, 0),
        "ZZ-CSV-キャンセル",
        "CANCELLED");
    // エスケープ確認用（カンマ・ダブルクォートを含む目的。期間外の 2026-08）
    insertReservation(
        R_ESCAPE,
        LocalDateTime.of(2026, 8, 5, 9, 5),
        LocalDateTime.of(2026, 8, 5, 10, 0),
        "ZZ-CSV-定例会議, 資料 \"A\" 確認",
        "APPROVED");
  }

  private void insertUser(UUID id, String sub, String name, String role) {
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        id,
        sub,
        name,
        sub + "@example.com",
        DEPT_ID,
        role,
        CREATED_AT);
  }

  private void insertReservation(
      UUID id, LocalDateTime startAt, LocalDateTime endAt, String purpose, String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        REQUESTER_ID,
        startAt,
        endAt,
        purpose,
        status,
        CREATED_AT,
        CREATED_AT);
  }

  /** FK 逆順（reservations → resources → users → departments）で削除する。 */
  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update("DELETE FROM reservations WHERE requester_id = ?", REQUESTER_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", RESOURCE_ID);
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?, ?)",
        ADMIN_AUTH_ID,
        MEMBER_AUTH_ID,
        APPROVER_AUTH_ID,
        REQUESTER_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // ヘルパー
  // ---------------------------------------------------------------------------

  /** CSV を取得する。BOM を取り除かずに UTF-8 でデコードする。 */
  private String fetchCsv(MockHttpServletRequestBuilder request) throws Exception {
    MvcResult result = mockMvc.perform(request).andExpect(status().isOk()).andReturn();
    return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
  }

  private static MockHttpServletRequestBuilder periodRequest() {
    return get(URL).param("from", "2026-06-01T00:00:00").param("to", "2026-07-01T00:00:00");
  }

  private static void assertContainsOnly(String csv, List<UUID> expected) {
    for (UUID id : ALL_RESERVATIONS) {
      if (expected.contains(id)) {
        assertThat(csv).as("含まれるはず: %s", id).contains(id.toString());
      } else {
        assertThat(csv).as("含まれないはず: %s", id).doesNotContain(id.toString());
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 認可（AC-4.2〜4.4）と基本応答（AC-1.1）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_admin_returns200WithCsvHeaders() throws Exception {
    String expectedFilename =
        "reservations_" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + ".csv";

    mockMvc
        .perform(get(URL))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "text/csv;charset=UTF-8"))
        .andExpect(
            header()
                .string(
                    "Content-Disposition", "attachment; filename=\"" + expectedFilename + "\""));
  }

  @Test
  @WithMockMember
  void downloadReservationsCsv_member_returns403() throws Exception {
    mockMvc
        .perform(get(URL))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void downloadReservationsCsv_approver_returns403() throws Exception {
    mockMvc
        .perform(get(URL))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void downloadReservationsCsv_unauthenticated_returns401() throws Exception {
    mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
  }

  // ---------------------------------------------------------------------------
  // 本文（AC-1.2〜1.6）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_noConditions_startsWithBomAndJapaneseHeader() throws Exception {
    String csv = fetchCsv(get(URL));

    assertThat(csv).startsWith(BOM + HEADER + "\r\n");
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_noConditions_includesAllStatusesOfAllUsers() throws Exception {
    String csv = fetchCsv(get(URL));

    assertContainsOnly(csv, ALL_RESERVATIONS);
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_noConditions_sortsByStartAtAscending() throws Exception {
    String csv = fetchCsv(get(URL));

    assertThat(csv.indexOf(R_CARRY_OVER.toString()))
        .isLessThan(csv.indexOf(R_BEFORE_FROM.toString()));
    assertThat(csv.indexOf(R_BEFORE_FROM.toString())).isLessThan(csv.indexOf(R_AT_FROM.toString()));
    assertThat(csv.indexOf(R_AT_FROM.toString())).isLessThan(csv.indexOf(R_PENDING.toString()));
    assertThat(csv.indexOf(R_PENDING.toString())).isLessThan(csv.indexOf(R_AT_TO.toString()));
    assertThat(csv.indexOf(R_AT_TO.toString())).isLessThan(csv.indexOf(R_ESCAPE.toString()));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_pendingReservation_formatsRowWithJapaneseStatusAndDate()
      throws Exception {
    String csv = fetchCsv(get(URL).param("status", "PENDING"));

    assertThat(csv)
        .contains(
            R_PENDING + ",帳票会議室,帳票申請者,2026/06/10 10:00,2026/06/10 11:00,ZZ-CSV-承認待ち,承認待ち\r\n");
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_purposeWithCommaAndQuote_isEscaped() throws Exception {
    String csv = fetchCsv(get(URL));

    assertThat(csv)
        .contains(
            R_ESCAPE
                + ",帳票会議室,帳票申請者,2026/08/05 09:05,2026/08/05 10:00,"
                + "\"ZZ-CSV-定例会議, 資料 \"\"A\"\" 確認\",承認済み\r\n");
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_noMatchingReservation_returnsHeaderOnly() throws Exception {
    String csv =
        fetchCsv(get(URL).param("from", "1999-01-01T00:00:00").param("to", "1999-02-01T00:00:00"));

    assertThat(csv).isEqualTo(BOM + HEADER + "\r\n");
  }

  // ---------------------------------------------------------------------------
  // 期間（AC-2.1〜2.5）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_period_includesFromAndExcludesTo() throws Exception {
    String csv = fetchCsv(periodRequest());

    assertContainsOnly(csv, List.of(R_AT_FROM, R_BEFORE_TO, R_PENDING, R_REJECTED, R_CANCELLED));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_period_excludesReservationCarriedOverFromBefore() throws Exception {
    String csv = fetchCsv(periodRequest());

    assertThat(csv).doesNotContain(R_CARRY_OVER.toString());
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_onlyFrom_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL).param("from", "2026-06-01T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_onlyTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL).param("to", "2026-07-01T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_fromEqualsTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL).param("from", "2026-06-01T00:00:00").param("to", "2026-06-01T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_fromAfterTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL).param("from", "2026-07-01T00:00:00").param("to", "2026-06-01T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_fromWithOffset_returns400ValidationError() throws Exception {
    mockMvc
        .perform(
            get(URL).param("from", "2026-06-01T00:00:00+09:00").param("to", "2026-07-01T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  // ---------------------------------------------------------------------------
  // ステータス（AC-3.1〜3.3）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_singleStatus_returnsOnlyThatStatus() throws Exception {
    String csv = fetchCsv(get(URL).param("status", "REJECTED"));

    assertContainsOnly(csv, List.of(R_REJECTED));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_multipleStatuses_returnsAnyOfThem() throws Exception {
    String csv = fetchCsv(get(URL).param("status", "PENDING", "REJECTED"));

    assertContainsOnly(csv, List.of(R_PENDING, R_REJECTED));
  }

  @Test
  @WithMockAdmin
  void downloadReservationsCsv_periodAndStatus_returnsOnlyThoseSatisfyingBoth() throws Exception {
    String csv = fetchCsv(periodRequest().param("status", "APPROVED"));

    assertContainsOnly(csv, List.of(R_AT_FROM, R_BEFORE_TO));
  }
}
