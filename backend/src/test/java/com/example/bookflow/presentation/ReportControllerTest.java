package com.example.bookflow.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
import com.example.bookflow.support.WithMockApprover;
import com.example.bookflow.support.WithMockMember;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MvcResult;

/**
 * {@link ReportController} 結合テスト（api-spec.md §帳票出力 準拠）。
 *
 * <p>200 系は {@code StreamingResponseBody} の非同期ディスパッチを経由するため {@code asyncDispatch} が必要。 403/401/400
 * はコントローラ本体・フィルタチェーンで同期的に完結するため、既存コントローラと同じ書き方で検証できる。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReportControllerTest extends BaseControllerTest {

  private static final UUID DEPT_ID = UUID.fromString("40000000-0000-0000-0000-000000000001");
  private static final UUID MEMBER_ID = UUID.fromString("40000000-0000-0000-0000-000000000002");
  private static final UUID ADMIN_ID = UUID.fromString("40000000-0000-0000-0000-000000000003");
  private static final UUID APPROVER_ID = UUID.fromString("40000000-0000-0000-0000-000000000004");
  private static final UUID RESOURCE_ID = UUID.fromString("40000000-0000-0000-0000-000000000010");

  /** 2026-09-01 開始・APPROVED */
  private static final UUID RESERVATION_SEPT1_ID =
      UUID.fromString("40000000-0000-0000-0000-000000000020");

  /** 2026-09-15 開始・PENDING */
  private static final UUID RESERVATION_SEPT15_ID =
      UUID.fromString("40000000-0000-0000-0000-000000000021");

  /** 2026-09-30 開始・CANCELLED・目的が数式インジェクションを試みる値 */
  private static final UUID RESERVATION_SEPT30_ID =
      UUID.fromString("40000000-0000-0000-0000-000000000022");

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "テスト部");

    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        MEMBER_ID,
        "test-member-sub",
        "テスト会員",
        "report-member@example.com",
        DEPT_ID,
        "MEMBER",
        LocalDateTime.of(2026, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        ADMIN_ID,
        "test-admin-sub",
        "管理者",
        "report-admin@example.com",
        DEPT_ID,
        "ADMIN",
        LocalDateTime.of(2026, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        APPROVER_ID,
        "test-approver-sub",
        "承認者",
        "report-approver@example.com",
        DEPT_ID,
        "APPROVER",
        LocalDateTime.of(2026, 4, 1, 9, 0));

    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "第1会議室",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2026, 4, 1, 9, 0));

    insertReservation(
        RESERVATION_SEPT1_ID,
        LocalDateTime.of(2026, 9, 1, 10, 0),
        LocalDateTime.of(2026, 9, 1, 12, 0),
        "週次ミーティング",
        "APPROVED");
    insertReservation(
        RESERVATION_SEPT15_ID,
        LocalDateTime.of(2026, 9, 15, 10, 0),
        LocalDateTime.of(2026, 9, 15, 12, 0),
        "月次報告会",
        "PENDING");
    insertReservation(
        RESERVATION_SEPT30_ID,
        LocalDateTime.of(2026, 9, 30, 10, 0),
        LocalDateTime.of(2026, 9, 30, 12, 0),
        "=1+1",
        "CANCELLED");
  }

  private void insertReservation(
      UUID id, LocalDateTime startAt, LocalDateTime endAt, String purpose, String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at,"
            + " updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        MEMBER_ID,
        startAt,
        endAt,
        purpose,
        status,
        LocalDateTime.of(2026, 8, 1, 9, 0),
        LocalDateTime.of(2026, 8, 1, 9, 0));
  }

  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update(
        "DELETE FROM reservations WHERE id IN (?, ?, ?)",
        RESERVATION_SEPT1_ID,
        RESERVATION_SEPT15_ID,
        RESERVATION_SEPT30_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", RESOURCE_ID);
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?)", MEMBER_ID, ADMIN_ID, APPROVER_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  private byte[] downloadCsvAsAdmin(String queryString) throws Exception {
    MvcResult mvcResult =
        mockMvc
            .perform(get("/api/reports/reservations/csv" + queryString))
            .andExpect(request().asyncStarted())
            .andReturn();

    MockHttpServletResponse response =
        mockMvc
            .perform(asyncDispatch(mvcResult))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse();
    return response.getContentAsByteArray();
  }

  // ---------------------------------------------------------------------------
  // 認可（403/401/200 の4点セット）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void exportReservationsCsv_withMember_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void exportReservationsCsv_withApprover_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void exportReservationsCsv_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get("/api/reports/reservations/csv"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_withAdmin_returnsCsvWithBomAndJapaneseHeader() throws Exception {
    MvcResult mvcResult =
        mockMvc
            .perform(get("/api/reports/reservations/csv"))
            .andExpect(request().asyncStarted())
            .andReturn();

    MockHttpServletResponse response =
        mockMvc
            .perform(asyncDispatch(mvcResult))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", Matchers.containsString("text/csv")))
            .andExpect(
                header()
                    .string(
                        "Content-Disposition",
                        Matchers.containsString("attachment; filename=\"reservations_")))
            .andReturn()
            .getResponse();

    byte[] bytes = response.getContentAsByteArray();
    assertThat(bytes[0]).isEqualTo((byte) 0xEF);
    assertThat(bytes[1]).isEqualTo((byte) 0xBB);
    assertThat(bytes[2]).isEqualTo((byte) 0xBF);

    String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
    assertThat(csv.lines().findFirst())
        .contains("\"予約ID\",\"リソース名\",\"申請者名\",\"開始日時\",\"終了日時\",\"目的\",\"承認状態\"");
  }

  // ---------------------------------------------------------------------------
  // 出力範囲・絞り込み
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportReservationsCsv_whenAdmin_containsAllUsersReservations() throws Exception {
    byte[] bytes = downloadCsvAsAdmin("");
    String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

    assertThat(csv.lines().toList()).hasSize(4); // ヘッダ + 3件
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_withFromAndTo_filtersByStartAt() throws Exception {
    byte[] bytes = downloadCsvAsAdmin("?from=2026-09-15T00:00:00&to=2026-09-30T23:59:59");
    String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
    List<String> lines = csv.lines().toList();

    assertThat(lines).hasSize(3); // ヘッダ + 2件（9/15・9/30）
    assertThat(csv).contains("月次報告会").contains("'=1+1"); // 9/30 の CSV インジェクション対策も併せて確認
    assertThat(csv).doesNotContain("週次ミーティング"); // 9/1 は範囲外
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_withStatus_filtersByStatus() throws Exception {
    byte[] bytes = downloadCsvAsAdmin("?status=APPROVED");
    String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

    assertThat(csv.lines().toList()).hasSize(2); // ヘッダ + 1件
    assertThat(csv).contains("週次ミーティング").contains("承認済み");
  }

  @Test
  @WithMockAdmin
  void exportReservationsCsv_withStatusRepeated_filtersByMultipleStatuses() throws Exception {
    byte[] bytes = downloadCsvAsAdmin("?status=APPROVED&status=PENDING");
    String csv = new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);

    assertThat(csv.lines().toList()).hasSize(3); // ヘッダ + 2件
  }

  // ---------------------------------------------------------------------------
  // バリデーション
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportReservationsCsv_whenFromAfterTo_returns400() throws Exception {
    mockMvc
        .perform(
            get("/api/reports/reservations/csv?from=2026-09-30T00:00:00&to=2026-09-01T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }
}
