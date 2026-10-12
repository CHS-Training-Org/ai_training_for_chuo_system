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
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

/**
 * {@link ReportController} 結合テスト（api-spec.md §帳票出力 準拠）。
 *
 * <p>ADMIN のみが CSV を取得でき、BOM・ヘッダ・列・並び順・期間重複・status 既定値が仕様どおりであることを確認する。 認可は {@code @WithMock*}
 * のデフォルト sub に対応する users 行を {@link
 * com.example.bookflow.infrastructure.security.RegisteredUserInterceptor} のためにシードする。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReportControllerTest extends BaseControllerTest {

  private static final String URL = "/api/reports/reservations/csv";
  private static final String HEADER_LINE = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";

  // ---- テスト用固定 ID（72xxxxxx プレフィックスで他テストと分離）----
  private static final UUID DEPT_ID = UUID.fromString("72000000-0000-0000-0000-000000000001");
  private static final UUID REQUESTER_ID = UUID.fromString("72000000-0000-0000-0000-000000000002");
  private static final UUID ADMIN_AUTH_ID = UUID.fromString("72000000-0000-0000-0000-000000000003");
  private static final UUID MEMBER_AUTH_ID =
      UUID.fromString("72000000-0000-0000-0000-000000000004");
  private static final UUID APPROVER_AUTH_ID =
      UUID.fromString("72000000-0000-0000-0000-000000000005");
  private static final UUID RESOURCE_ID = UUID.fromString("72000000-0000-0000-0000-000000000010");

  private static final UUID RES_EARLY_ID = UUID.fromString("72000000-0000-0000-0000-000000000021");
  private static final UUID RES_LATE_ID = UUID.fromString("72000000-0000-0000-0000-000000000022");
  private static final UUID RES_PENDING_ID =
      UUID.fromString("72000000-0000-0000-0000-000000000023");
  private static final UUID RES_DRAFT_ID = UUID.fromString("72000000-0000-0000-0000-000000000024");
  private static final UUID RES_SPECIAL_ID =
      UUID.fromString("72000000-0000-0000-0000-000000000025");

  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2025, 4, 1, 9, 0, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "帳票テスト部署");
    insertUser(
        REQUESTER_ID, "report-requester-72", "帳票 申請者", "report-requester72@example.com", "MEMBER");
    // RegisteredUserInterceptor が照合する認証ユーザー（@WithMock* のデフォルト sub に対応）
    insertUser(ADMIN_AUTH_ID, "test-admin-sub", "テスト管理者", "report-admin72@example.com", "ADMIN");
    insertUser(MEMBER_AUTH_ID, "test-member-sub", "テスト会員", "report-member72@example.com", "MEMBER");
    insertUser(
        APPROVER_AUTH_ID,
        "test-approver-sub",
        "テスト承認者",
        "report-approver72@example.com",
        "APPROVER");
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "帳票テスト会議室",
        "ROOM",
        false,
        true,
        CREATED_AT);

    // 2030 年の予約（既存データと期間が重ならないよう遠い年に置く）
    insertReservation(
        RES_LATE_ID,
        LocalDateTime.of(2030, 6, 20, 13, 0),
        LocalDateTime.of(2030, 6, 20, 14, 0),
        "REPORT-LATE",
        "APPROVED");
    insertReservation(
        RES_EARLY_ID,
        LocalDateTime.of(2030, 6, 10, 9, 30),
        LocalDateTime.of(2030, 6, 10, 11, 0),
        "REPORT-EARLY",
        "APPROVED");
    insertReservation(
        RES_PENDING_ID,
        LocalDateTime.of(2030, 6, 15, 10, 0),
        LocalDateTime.of(2030, 6, 15, 12, 0),
        "REPORT-PENDING",
        "PENDING");
    insertReservation(
        RES_DRAFT_ID,
        LocalDateTime.of(2030, 6, 16, 10, 0),
        LocalDateTime.of(2030, 6, 16, 12, 0),
        "REPORT-DRAFT",
        "DRAFT");
    insertReservation(
        RES_SPECIAL_ID,
        LocalDateTime.of(2030, 6, 25, 10, 0),
        LocalDateTime.of(2030, 6, 25, 12, 0),
        "=SUM(A1,A2) \"引用\"",
        "CANCELLED");
  }

  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update("DELETE FROM reservations WHERE resource_id = ?", RESOURCE_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", RESOURCE_ID);
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?, ?)",
        REQUESTER_ID,
        ADMIN_AUTH_ID,
        MEMBER_AUTH_ID,
        APPROVER_AUTH_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
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
        CREATED_AT);
  }

  private void insertReservation(
      UUID id, LocalDateTime start, LocalDateTime end, String purpose, String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at,"
            + " updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        REQUESTER_ID,
        start,
        end,
        purpose,
        status,
        CREATED_AT,
        CREATED_AT);
  }

  /** CSV を取得して BOM を除いた本文を返す（レスポンスの先頭 3 バイトが BOM であることも検証する）。 */
  private String fetchCsv(String query) throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(URL + query).accept(MediaType.ALL))
            .andExpect(status().isOk())
            .andReturn();
    byte[] bytes = result.getResponse().getContentAsByteArray();
    assertThat(Arrays.copyOfRange(bytes, 0, 3))
        .isEqualTo(new byte[] {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
    return new String(Arrays.copyOfRange(bytes, 3, bytes.length), StandardCharsets.UTF_8);
  }

  /** 本文から、このテストのリソースの行（データ行）だけを順序を保って取り出す。 */
  private List<String> dataLinesOfTestResource(String body) {
    return Arrays.stream(body.split("\r\n")).filter(l -> l.contains("帳票テスト会議室")).toList();
  }

  // ---------------------------------------------------------------------------
  // 認可（RPT-04）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void reservationsCsv_withMember_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get(URL).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void reservationsCsv_withApprover_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get(URL).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void reservationsCsv_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get(URL).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  // ---------------------------------------------------------------------------
  // 応答ヘッダと本文（RPT-01・RPT-02）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_withAdmin_returnsCsvHeadersAndBom() throws Exception {
    String expectedFilename =
        "reservations_" + LocalDate.now().toString().replace("-", "") + ".csv";

    mockMvc
        .perform(get(URL).accept(MediaType.ALL))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "text/csv;charset=UTF-8"))
        .andExpect(
            header()
                .string("Content-Disposition", "attachment; filename=\"" + expectedFilename + "\""))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withAdmin_startsWithJapaneseHeaderLineAndEndsWithCrlf() throws Exception {
    String body = fetchCsv("");

    assertThat(body).startsWith(HEADER_LINE + "\r\n");
    assertThat(body).endsWith("\r\n");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withAdmin_outputsSevenColumnsWithLabelsAndFormattedDateTime()
      throws Exception {
    String body = fetchCsv("");

    assertThat(body)
        .contains(
            RES_EARLY_ID
                + ",帳票テスト会議室,帳票 申請者,2030-06-10 09:30,2030-06-10 11:00,REPORT-EARLY,承認済み\r\n");
    assertThat(body)
        .contains(
            RES_PENDING_ID
                + ",帳票テスト会議室,帳票 申請者,2030-06-15 10:00,2030-06-15 12:00,REPORT-PENDING,承認待ち\r\n");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withAdmin_sortsByStartAtAscending() throws Exception {
    List<String> lines = dataLinesOfTestResource(fetchCsv("?status=APPROVED"));

    assertThat(lines).hasSize(2);
    assertThat(lines.get(0)).startsWith(RES_EARLY_ID.toString());
    assertThat(lines.get(1)).startsWith(RES_LATE_ID.toString());
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_purposeWithFormulaAndQuotes_isNeutralizedAndEscaped() throws Exception {
    String body = fetchCsv("?status=CANCELLED");

    assertThat(body).contains(",\"'=SUM(A1,A2) \"\"引用\"\"\",キャンセル済み\r\n");
  }

  // ---------------------------------------------------------------------------
  // status の絞り込み（RPT-03）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_withoutStatus_excludesDraft() throws Exception {
    String body = fetchCsv("");

    assertThat(body).contains("REPORT-EARLY").contains("REPORT-PENDING");
    assertThat(body).doesNotContain("REPORT-DRAFT");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withStatusDraft_returnsDraftOnly() throws Exception {
    List<String> lines = dataLinesOfTestResource(fetchCsv("?status=DRAFT"));

    assertThat(lines).hasSize(1);
    assertThat(lines.get(0)).contains("REPORT-DRAFT").endsWith("下書き");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withMultipleStatuses_returnsAnyOfThem() throws Exception {
    String body = fetchCsv("?status=PENDING&status=DRAFT");

    assertThat(body).contains("REPORT-PENDING").contains("REPORT-DRAFT");
    assertThat(body).doesNotContain("REPORT-EARLY");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withInvalidStatus_returns400() throws Exception {
    mockMvc
        .perform(get(URL + "?status=UNKNOWN").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest());
  }

  // ---------------------------------------------------------------------------
  // 期間の絞り込み（RPT-03）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_withPeriod_returnsOnlyOverlappingReservations() throws Exception {
    String body = fetchCsv("?from=2030-06-14T00:00:00&to=2030-06-18T00:00:00");

    assertThat(body).contains("REPORT-PENDING");
    assertThat(body).doesNotContain("REPORT-EARLY").doesNotContain("REPORT-LATE");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withPeriodTouchingOnlyAtBoundary_excludesAdjacentReservation()
      throws Exception {
    // REPORT-EARLY は 09:30-11:00。to が開始日時ちょうど、from が終了日時ちょうどの場合は含まれない
    String beforeStart = fetchCsv("?from=2030-06-10T08:00:00&to=2030-06-10T09:30:00");
    String afterEnd = fetchCsv("?from=2030-06-10T11:00:00&to=2030-06-10T12:00:00");

    assertThat(beforeStart).doesNotContain("REPORT-EARLY");
    assertThat(afterEnd).doesNotContain("REPORT-EARLY");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withPeriodAndStatus_combinesWithAnd() throws Exception {
    String body = fetchCsv("?status=APPROVED&from=2030-06-01T00:00:00&to=2030-06-30T00:00:00");

    assertThat(body).contains("REPORT-EARLY").contains("REPORT-LATE");
    assertThat(body).doesNotContain("REPORT-PENDING");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withNoMatch_returnsHeaderLineWithoutTestRows() throws Exception {
    String body = fetchCsv("?from=2040-01-01T00:00:00&to=2040-01-02T00:00:00");

    assertThat(body).isEqualTo(HEADER_LINE + "\r\n");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withOnlyFrom_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL + "?from=2030-06-01T00:00:00").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withOnlyTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL + "?to=2030-06-30T00:00:00").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withoutPeriod_includesAllPeriods() throws Exception {
    String body = fetchCsv("");

    assertThat(body).contains("REPORT-EARLY").contains("REPORT-LATE");
  }
}
