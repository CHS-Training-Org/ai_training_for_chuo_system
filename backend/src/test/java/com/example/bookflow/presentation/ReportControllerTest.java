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
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * {@link ReportController} 結合テスト（api-spec.md §帳票 準拠）。
 *
 * <p>StreamingResponseBody は非同期のため、{@code asyncStarted} を確認してから {@code asyncDispatch} で本文を検証する。
 * テストデータは他のテストと衝突しないよう 2090 年台の日時で挿入し、全ケースで期間を指定して絞り込む。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReportControllerTest extends BaseControllerTest {

  private static final String URL = "/api/reports/reservations/csv";
  private static final String HEADER_LINE = "予約ID,リソース名,申請者名,開始日時,終了日時,利用目的,ステータス\r\n";

  // ---- テスト用固定 ID（他の結合テストの 1000... と重ならない 2000... を使う） ----
  private static final UUID DEPT_ID = UUID.fromString("20000000-0000-0000-0000-000000000001");
  private static final UUID MEMBER_ID = UUID.fromString("20000000-0000-0000-0000-000000000002");
  private static final UUID ADMIN_ID = UUID.fromString("20000000-0000-0000-0000-000000000003");
  private static final UUID APPROVER_ID = UUID.fromString("20000000-0000-0000-0000-000000000004");
  private static final UUID RESOURCE_ID = UUID.fromString("20000000-0000-0000-0000-000000000010");
  private static final UUID R_APPROVED = UUID.fromString("20000000-0000-0000-0000-000000000021");
  private static final UUID R_PENDING = UUID.fromString("20000000-0000-0000-0000-000000000022");
  private static final UUID R_CANCELLED = UUID.fromString("20000000-0000-0000-0000-000000000023");
  private static final UUID R_ON_TO_BOUNDARY =
      UUID.fromString("20000000-0000-0000-0000-000000000024");

  // 期間 [2090-10-01, 2090-11-01) に R_APPROVED / R_PENDING / R_CANCELLED が入り、
  // R_ON_TO_BOUNDARY は start_at が 2090-11-01 00:00 ちょうど（to 未満の境界で除外される）。
  private static final String RANGE_FROM = "2090-10-01T00:00:00";
  private static final String RANGE_TO = "2090-11-01T00:00:00";

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    LocalDateTime created = LocalDateTime.of(2025, 4, 1, 9, 0);
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "帳票テスト部");
    insertUser(MEMBER_ID, "test-member-sub", "山田 太郎", "report-member@example.com", "MEMBER");
    insertUser(ADMIN_ID, "test-admin-sub", "管理者", "report-admin@example.com", "ADMIN");
    insertUser(APPROVER_ID, "test-approver-sub", "承認者", "report-approver@example.com", "APPROVER");
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "帳票テスト会議室",
        "ROOM",
        false,
        true,
        created);
    insertReservation(
        R_APPROVED,
        LocalDateTime.of(2090, 10, 10, 10, 0),
        LocalDateTime.of(2090, 10, 10, 11, 30),
        "定例会議",
        "APPROVED");
    insertReservation(
        R_PENDING,
        LocalDateTime.of(2090, 10, 20, 10, 0),
        LocalDateTime.of(2090, 10, 20, 11, 0),
        "=HYPERLINK(\"http://example.com\",\"クリック\")",
        "PENDING");
    insertReservation(
        R_CANCELLED,
        LocalDateTime.of(2090, 10, 31, 23, 59),
        LocalDateTime.of(2090, 11, 1, 0, 30),
        "A,B 会議\n改行あり",
        "CANCELLED");
    insertReservation(
        R_ON_TO_BOUNDARY,
        LocalDateTime.of(2090, 11, 1, 0, 0),
        LocalDateTime.of(2090, 11, 1, 1, 0),
        "境界",
        "APPROVED");
  }

  @AfterEach
  void deleteSeedData() {
    for (UUID id : new UUID[] {R_APPROVED, R_PENDING, R_CANCELLED, R_ON_TO_BOUNDARY}) {
      jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", id);
    }
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", RESOURCE_ID);
    for (UUID id : new UUID[] {MEMBER_ID, ADMIN_ID, APPROVER_ID}) {
      jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);
    }
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
        LocalDateTime.of(2025, 4, 1, 9, 0));
  }

  private void insertReservation(
      UUID id, LocalDateTime start, LocalDateTime end, String purpose, String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        MEMBER_ID,
        start,
        end,
        purpose,
        status,
        LocalDateTime.of(2025, 4, 1, 9, 0),
        LocalDateTime.of(2025, 4, 1, 9, 0));
  }

  /** 非同期（ストリーミング）の完了まで待ち、デコード前のバイト列を返す。 */
  private byte[] fetchBytes(MockHttpServletRequestBuilder req) throws Exception {
    MvcResult started = mockMvc.perform(req).andExpect(request().asyncStarted()).andReturn();
    return mockMvc
        .perform(asyncDispatch(started))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsByteArray();
  }

  /** BOM を除いた本文（UTF-8）を返す。 */
  private String fetchBody(MockHttpServletRequestBuilder req) throws Exception {
    byte[] bytes = fetchBytes(req);
    assertThat(bytes).startsWith(0xEF, 0xBB, 0xBF);
    return new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
  }

  private static MockHttpServletRequestBuilder rangeRequest() {
    return get(URL).param("from", RANGE_FROM).param("to", RANGE_TO);
  }

  // ---------------------------------------------------------------------------
  // 認可（FR-14）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportCsv_admin_returns200() throws Exception {
    fetchBytes(rangeRequest());
  }

  @Test
  @WithMockMember
  void exportCsv_member_returns403() throws Exception {
    mockMvc
        .perform(rangeRequest())
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void exportCsv_approver_returns403() throws Exception {
    mockMvc
        .perform(rangeRequest())
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void exportCsv_unauthenticated_returns401() throws Exception {
    mockMvc.perform(rangeRequest()).andExpect(status().isUnauthorized());
  }

  // ---------------------------------------------------------------------------
  // ヘッダ（FR-01）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportCsv_admin_setsCsvDownloadHeaders() throws Exception {
    MvcResult started =
        mockMvc.perform(rangeRequest()).andExpect(request().asyncStarted()).andReturn();

    mockMvc
        .perform(asyncDispatch(started))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", org.hamcrest.Matchers.startsWith("text/csv")))
        .andExpect(
            header()
                .string("Content-Type", org.hamcrest.Matchers.containsStringIgnoringCase("UTF-8")))
        .andExpect(
            header()
                .string(
                    "Content-Disposition",
                    org.hamcrest.Matchers.matchesPattern(
                        "attachment; filename=\"?reservations_\\d{8}_\\d{6}\\.csv\"?")))
        .andExpect(
            header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
  }

  // ---------------------------------------------------------------------------
  // 本文（FR-02〜05, 10）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportCsv_admin_returnsBomHeaderAndRowsInStartAtOrder() throws Exception {
    String body = fetchBody(rangeRequest());

    assertThat(body).startsWith(HEADER_LINE);
    int approved = body.indexOf(R_APPROVED.toString());
    int pending = body.indexOf(R_PENDING.toString());
    int cancelled = body.indexOf(R_CANCELLED.toString());
    assertThat(approved).isPositive();
    assertThat(pending).isGreaterThan(approved);
    assertThat(cancelled).isGreaterThan(pending);
    assertThat(body)
        .contains(R_APPROVED + ",帳票テスト会議室,山田 太郎,2090-10-10 10:00,2090-10-10 11:30,定例会議,承認済み\r\n");
  }

  @Test
  @WithMockAdmin
  void exportCsv_noMatchingReservations_returnsHeaderOnly() throws Exception {
    String body =
        fetchBody(get(URL).param("from", "2080-01-01T00:00:00").param("to", "2080-02-01T00:00:00"));

    assertThat(body).isEqualTo(HEADER_LINE);
  }

  @Test
  @WithMockAdmin
  void exportCsv_formulaPurpose_isSanitizedWithApostrophe() throws Exception {
    String body = fetchBody(rangeRequest());

    assertThat(body).contains(",\"'=HYPERLINK(\"\"http://example.com\"\",\"\"クリック\"\")\",承認待ち\r\n");
  }

  @Test
  @WithMockAdmin
  void exportCsv_purposeWithCommaAndNewline_isQuoted() throws Exception {
    String body = fetchBody(rangeRequest());

    assertThat(body).contains(",\"A,B 会議\n改行あり\",キャンセル済み\r\n");
  }

  // ---------------------------------------------------------------------------
  // 絞り込み（FR-06, 07, 09）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportCsv_singleStatus_returnsOnlyThatStatus() throws Exception {
    String body = fetchBody(rangeRequest().param("status", "PENDING"));

    assertThat(body).contains(R_PENDING.toString());
    assertThat(body).doesNotContain(R_APPROVED.toString()).doesNotContain(R_CANCELLED.toString());
  }

  @Test
  @WithMockAdmin
  void exportCsv_multipleStatuses_returnsUnion() throws Exception {
    String body = fetchBody(rangeRequest().param("status", "PENDING", "APPROVED"));

    assertThat(body).contains(R_PENDING.toString()).contains(R_APPROVED.toString());
    assertThat(body).doesNotContain(R_CANCELLED.toString());
  }

  @Test
  @WithMockAdmin
  void exportCsv_fromOnly_includesReservationsStartingAtOrAfterFrom() throws Exception {
    String body = fetchBody(get(URL).param("from", "2090-10-20T10:00:00"));

    // from ちょうど（R_PENDING）は含み、それより前（R_APPROVED）は除外する。
    assertThat(body).contains(R_PENDING.toString()).contains(R_CANCELLED.toString());
    assertThat(body).contains(R_ON_TO_BOUNDARY.toString());
    assertThat(body).doesNotContain(R_APPROVED.toString());
  }

  @Test
  @WithMockAdmin
  void exportCsv_toOnly_excludesReservationsStartingAtOrAfterTo() throws Exception {
    // to のみ指定。2090 年より前のデータが混ざっても本テストの検証対象は seed のみ。
    String body = fetchBody(get(URL).param("to", "2090-10-20T10:00:00"));

    assertThat(body).contains(R_APPROVED.toString());
    assertThat(body)
        .doesNotContain(R_PENDING.toString())
        .doesNotContain(R_CANCELLED.toString())
        .doesNotContain(R_ON_TO_BOUNDARY.toString());
  }

  @Test
  @WithMockAdmin
  void exportCsv_startAtEqualsTo_isExcluded() throws Exception {
    String body = fetchBody(rangeRequest());

    assertThat(body).doesNotContain(R_ON_TO_BOUNDARY.toString());
  }

  @Test
  @WithMockAdmin
  void exportCsv_startAtEqualsFrom_isIncluded() throws Exception {
    String body =
        fetchBody(get(URL).param("from", "2090-11-01T00:00:00").param("to", "2090-11-02T00:00:00"));

    assertThat(body).contains(R_ON_TO_BOUNDARY.toString());
  }

  @Test
  @WithMockAdmin
  void exportCsv_statusAndRange_combineWithAnd() throws Exception {
    String body =
        fetchBody(
            get(URL)
                .param("status", "APPROVED")
                .param("from", RANGE_FROM)
                .param("to", "2090-11-02T00:00:00"));

    // APPROVED のうち期間内は R_APPROVED と R_ON_TO_BOUNDARY（to を 11/02 に広げたため含まれる）
    assertThat(body).contains(R_APPROVED.toString()).contains(R_ON_TO_BOUNDARY.toString());
    assertThat(body).doesNotContain(R_PENDING.toString()).doesNotContain(R_CANCELLED.toString());
  }

  @Test
  @WithMockAdmin
  void exportCsv_includesReservationsOfAllUsers() throws Exception {
    // 実行者（ADMIN）本人ではなく MEMBER の予約が出力される（本人分に限定しない）。
    String body = fetchBody(rangeRequest());

    assertThat(body).contains("山田 太郎");
  }

  // ---------------------------------------------------------------------------
  // 400（FR-08）— 書き出し開始前に確定する
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void exportCsv_fromAfterTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL).param("from", RANGE_TO).param("to", RANGE_FROM))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void exportCsv_fromEqualsTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL).param("from", RANGE_FROM).param("to", RANGE_FROM))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void exportCsv_invalidDateFormat_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL).param("from", "not-a-date"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void exportCsv_invalidStatus_returns400ValidationError() throws Exception {
    mockMvc
        .perform(rangeRequest().param("status", "UNKNOWN"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }
}
