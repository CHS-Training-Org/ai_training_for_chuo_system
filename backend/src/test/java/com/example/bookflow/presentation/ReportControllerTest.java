package com.example.bookflow.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
import com.example.bookflow.support.WithMockApprover;
import com.example.bookflow.support.WithMockMember;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;

/**
 * {@link ReportController} 結合テスト（{@code csv-export.md} RPT-01〜05 準拠）。
 *
 * <p>テストデータは {@link JdbcTemplate} で直接挿入・削除し、H2 インメモリ DB を使用する（{@code ResourceControllerTest}
 * と同じ規約）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReportControllerTest extends BaseControllerTest {

  private static final UUID DEPT_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");
  private static final UUID MEMBER_ID = UUID.fromString("40000000-0000-0000-0000-000000000002");
  private static final UUID APPROVER_ID = UUID.fromString("40000000-0000-0000-0000-000000000003");
  private static final UUID ADMIN_ID = UUID.fromString("40000000-0000-0000-0000-000000000004");
  private static final UUID RESOURCE_ID = UUID.fromString("40000000-0000-0000-0000-000000000010");
  private static final UUID RESERVATION_APPROVED_ID =
      UUID.fromString("40000000-0000-0000-0000-000000000020");
  private static final UUID RESERVATION_PENDING_ID =
      UUID.fromString("40000000-0000-0000-0000-000000000021");

  // 承認済み予約：2026-09-01 10:00〜12:00
  private static final LocalDateTime APPROVED_START = LocalDateTime.of(2026, 9, 1, 10, 0);
  private static final LocalDateTime APPROVED_END = LocalDateTime.of(2026, 9, 1, 12, 0);
  // 承認待ち予約：2026-10-01 10:00〜12:00（期間フィルタで承認済みと区別するため月をずらす）
  private static final LocalDateTime PENDING_START = LocalDateTime.of(2026, 10, 1, 10, 0);
  private static final LocalDateTime PENDING_END = LocalDateTime.of(2026, 10, 1, 12, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "テスト部");

    // cognito_sub は @WithMockMember/@WithMockApprover/@WithMockAdmin のデフォルト sub と一致させる
    // （RegisteredUserInterceptor が全リクエストで JWT sub と users テーブルを照合するため）
    insertUser(MEMBER_ID, "test-member-sub", "member@example.com", "会員太郎", "MEMBER");
    insertUser(APPROVER_ID, "test-approver-sub", "approver@example.com", "承認花子", "APPROVER");
    insertUser(ADMIN_ID, "test-admin-sub", "admin@example.com", "管理者次郎", "ADMIN");

    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "第1会議室",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));

    insertReservation(
        RESERVATION_APPROVED_ID, MEMBER_ID, APPROVED_START, APPROVED_END, "定例会議", "APPROVED");
    insertReservation(
        RESERVATION_PENDING_ID, MEMBER_ID, PENDING_START, PENDING_END, "予算会議", "PENDING");
  }

  private void insertUser(UUID id, String cognitoSub, String email, String name, String role) {
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        id,
        cognitoSub,
        name,
        email,
        DEPT_ID,
        role,
        LocalDateTime.of(2025, 4, 1, 9, 0));
  }

  private void insertReservation(
      UUID id,
      UUID requesterId,
      LocalDateTime start,
      LocalDateTime end,
      String purpose,
      String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        requesterId,
        start,
        end,
        purpose,
        status,
        LocalDateTime.of(2025, 4, 1, 9, 0),
        LocalDateTime.of(2025, 4, 1, 9, 0));
  }

  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", RESERVATION_APPROVED_ID);
    jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", RESERVATION_PENDING_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", RESOURCE_ID);
    jdbcTemplate.update("DELETE FROM users WHERE id = ?", MEMBER_ID);
    jdbcTemplate.update("DELETE FROM users WHERE id = ?", APPROVER_ID);
    jdbcTemplate.update("DELETE FROM users WHERE id = ?", ADMIN_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // GET /api/reports/reservations/csv — 認可
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void csv_admin_returns200WithCsvBody() throws Exception {
    MockHttpServletResponse response =
        mockMvc
            .perform(get("/api/reports/reservations/csv"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();

    assertThat(response.getContentType()).contains("text/csv");
    assertThat(response.getHeader("Content-Disposition")).contains("attachment");
    assertThat(response.getHeader("Content-Disposition")).contains("reservations.csv");

    String body = new String(response.getContentAsByteArray(), StandardCharsets.UTF_8);
    assertThat(body).startsWith("﻿");
    assertThat(body).contains("予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態");
    assertThat(body).contains("第1会議室,会員太郎,2026/09/01 10:00,2026/09/01 12:00,定例会議,承認済み");
    assertThat(body).contains("第1会議室,会員太郎,2026/10/01 10:00,2026/10/01 12:00,予算会議,承認待ち");
  }

  @Test
  @WithMockMember
  void csv_member_returns403() throws Exception {
    mockMvc.perform(get("/api/reports/reservations/csv")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockApprover
  void csv_approver_returns403() throws Exception {
    mockMvc.perform(get("/api/reports/reservations/csv")).andExpect(status().isForbidden());
  }

  // ---------------------------------------------------------------------------
  // GET /api/reports/reservations/csv — from/to 同時指定必須
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void csv_fromOnlyWithoutTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(
            get("/api/reports/reservations/csv")
                .param("from", "2026-09-01T00:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void csv_toOnlyWithoutFrom_returns400ValidationError() throws Exception {
    mockMvc
        .perform(
            get("/api/reports/reservations/csv")
                .param("to", "2026-09-30T23:59:59")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  // ---------------------------------------------------------------------------
  // GET /api/reports/reservations/csv — 絞り込み
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void csv_withPeriodFilter_excludesReservationsOutsidePeriod() throws Exception {
    MockHttpServletResponse response =
        mockMvc
            .perform(
                get("/api/reports/reservations/csv")
                    .param("from", "2026-09-01T00:00:00")
                    .param("to", "2026-09-30T23:59:59"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();

    String body = new String(response.getContentAsByteArray(), StandardCharsets.UTF_8);
    assertThat(body).contains("定例会議");
    assertThat(body).doesNotContain("予算会議");
  }

  @Test
  @WithMockAdmin
  void csv_withStatusFilter_excludesOtherStatuses() throws Exception {
    MockHttpServletResponse response =
        mockMvc
            .perform(get("/api/reports/reservations/csv").param("status", "PENDING"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();

    String body = new String(response.getContentAsByteArray(), StandardCharsets.UTF_8);
    assertThat(body).contains("予算会議");
    assertThat(body).doesNotContain("定例会議");
  }

  @Test
  @WithMockAdmin
  void csv_withPeriodOutsideAnyReservation_returnsHeaderOnly() throws Exception {
    MockHttpServletResponse response =
        mockMvc
            .perform(
                get("/api/reports/reservations/csv")
                    .param("from", "2020-01-01T00:00:00")
                    .param("to", "2020-01-31T23:59:59"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();

    String body = new String(response.getContentAsByteArray(), StandardCharsets.UTF_8);
    assertThat(body).isEqualTo("﻿予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態\r\n");
  }
}
