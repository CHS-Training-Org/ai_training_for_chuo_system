package com.example.bookflow.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
import com.example.bookflow.support.WithMockApprover;
import com.example.bookflow.support.WithMockMember;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

/**
 * {@link ReportController} 結合テスト（api-spec.md §帳票出力 準拠・H2）。
 *
 * <p>ADMIN のみが {@code GET /api/reports/reservations/csv} にアクセスでき、期間・ステータスで絞り込んだ CSV が BOM 付き UTF-8
 * で返ることを確認する。
 *
 * <p>他のテストクラスのデータが残っていても影響を受けないよう、絞り込み付きのテストは 2037 年の日付と {@code 72xxxxxx} の ID
 * に限って検証する（絞り込みなしのテストは、自分のデータが含まれることだけを確認する）。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReportControllerTest extends BaseControllerTest {

  private static final String CSV_URL = "/api/reports/reservations/csv";

  private static final String HEADER_LINE = "予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態";

  // ---- テスト用固定 ID（72xxxxxx プレフィックスで他テストと分離）----
  private static final UUID DEPT_ID = id(1);

  private static final UUID ADMIN_AUTH_ID = id(11);
  private static final UUID MEMBER_AUTH_ID = id(12);
  private static final UUID APPROVER_AUTH_ID = id(13);
  private static final UUID YAMADA_ID = id(14);
  private static final UUID SATO_ID = id(15);

  private static final UUID RESOURCE_ROOM_ID = id(21);
  private static final UUID RESOURCE_PROJECTOR_ID = id(22);

  // 予約（開始日時の昇順に A < B < F = C < D < E < G。F と C は同じ開始日時で、ID は F が小さい）
  private static final UUID RES_A = id(101); // 2037-03-31 23:59:59 APPROVED（期間の直前）
  private static final UUID RES_B = id(102); // 2037-04-01 00:00:00 APPROVED（期間の先頭ちょうど）
  private static final UUID RES_F = id(103); // 2037-04-15 10:00:00 APPROVED（C と同時刻、ID が小さい）
  private static final UUID RES_C = id(104); // 2037-04-15 10:00:00 PENDING
  private static final UUID RES_D = id(105); // 2037-04-30 23:30:00 REJECTED（終了は翌日にまたがる）
  private static final UUID RES_E = id(106); // 2037-05-01 00:00:00 CANCELLED（to の翌日 0 時ちょうど）
  private static final UUID RES_G = id(107); // 2037-06-01 09:00:00 APPROVED（目的が数式）

  private static final List<UUID> ALL_RESERVATIONS =
      List.of(RES_A, RES_B, RES_F, RES_C, RES_D, RES_E, RES_G);

  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2025, 4, 1, 9, 0, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  private static UUID id(int n) {
    return UUID.fromString(String.format("72000000-0000-0000-0000-%012d", n));
  }

  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "帳票テスト部署");

    insertUser(ADMIN_AUTH_ID, "test-admin-sub", "テスト管理者", "admin-auth72@example.com", "ADMIN");
    insertUser(MEMBER_AUTH_ID, "test-member-sub", "テスト会員", "member-auth72@example.com", "MEMBER");
    insertUser(
        APPROVER_AUTH_ID, "test-approver-sub", "テスト承認者", "approver-auth72@example.com", "APPROVER");
    insertUser(YAMADA_ID, "user-yamada-72", "山田 太郎", "yamada72@example.com", "MEMBER");
    insertUser(SATO_ID, "user-sato-72", "佐藤 花子", "sato72@example.com", "MEMBER");

    insertResource(RESOURCE_ROOM_ID, "第1会議室72", "ROOM");
    insertResource(RESOURCE_PROJECTOR_ID, "プロジェクター72", "EQUIPMENT");

    insertReservation(
        RES_A, RESOURCE_ROOM_ID, YAMADA_ID, at(2037, 3, 31, 23, 59, 59), "期間の直前", "APPROVED");
    insertReservation(
        RES_B, RESOURCE_ROOM_ID, YAMADA_ID, at(2037, 4, 1, 0, 0, 0), "期間の先頭", "APPROVED");
    // C を先に挿入し、同時刻の並びが挿入順ではなく ID の昇順になることを確かめる
    insertReservation(
        RES_C, RESOURCE_PROJECTOR_ID, SATO_ID, at(2037, 4, 15, 10, 0, 0), "同時刻の承認待ち", "PENDING");
    insertReservation(
        RES_F, RESOURCE_ROOM_ID, SATO_ID, at(2037, 4, 15, 10, 0, 0), "同時刻の承認済み", "APPROVED");
    insertReservation(
        RES_D, RESOURCE_ROOM_ID, YAMADA_ID, at(2037, 4, 30, 23, 30, 0), "月末の却下", "REJECTED");
    insertReservation(
        RES_E, RESOURCE_PROJECTOR_ID, SATO_ID, at(2037, 5, 1, 0, 0, 0), "翌月のキャンセル", "CANCELLED");
    insertReservation(
        RES_G, RESOURCE_ROOM_ID, YAMADA_ID, at(2037, 6, 1, 9, 0, 0), "=1+1", "APPROVED");
  }

  @AfterEach
  void deleteSeedData() {
    for (UUID reservationId : ALL_RESERVATIONS) {
      jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", reservationId);
    }
    jdbcTemplate.update(
        "DELETE FROM resources WHERE id IN (?, ?)", RESOURCE_ROOM_ID, RESOURCE_PROJECTOR_ID);
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?, ?, ?)",
        ADMIN_AUTH_ID,
        MEMBER_AUTH_ID,
        APPROVER_AUTH_ID,
        YAMADA_ID,
        SATO_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // 成功時のレスポンス
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_withAdmin_returns200WithCsvHeadersAndBom() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-04-01").param("to", "2037-04-30"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString("text/csv")))
            .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString("charset=UTF-8")))
            .andExpect(
                header()
                    .string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        matchesPattern(
                            "attachment; filename=\"reservations_\\d{8}_\\d{6}\\.csv\"")))
            .andReturn();

    byte[] bytes = result.getResponse().getContentAsByteArray();
    assertThat(Arrays.copyOfRange(bytes, 0, 3))
        .containsExactly((byte) 0xEF, (byte) 0xBB, (byte) 0xBF);
    assertThat(lines(result).get(0)).isEqualTo(HEADER_LINE);
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_withoutParams_includesAllUsersReservationsAndNames() throws Exception {
    MvcResult result = mockMvc.perform(get(CSV_URL)).andExpect(status().isOk()).andReturn();

    String body = body(result);
    // ADMIN は全ユーザーの予約が対象（申請者が異なる予約がどちらも含まれる）
    assertThat(body).contains(RES_B.toString(), RES_C.toString());
    // JOIN したリソース名と申請者名が出力される
    assertThat(body).contains("第1会議室72", "プロジェクター72", "山田 太郎", "佐藤 花子");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_row_formatsColumnsInOrder() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-04-01").param("to", "2037-04-01"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(lines(result))
        .containsExactly(
            HEADER_LINE,
            RES_B + ",第1会議室72,山田 太郎,2037-04-01 00:00:00,2037-04-01 01:00:00,期間の先頭,承認済み");
  }

  // ---------------------------------------------------------------------------
  // 期間の絞り込み（開始日時で判定、to の日を含む）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_fromAndTo_includesBoundariesAndExcludesOutside() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-04-01").param("to", "2037-04-30"))
            .andExpect(status().isOk())
            .andReturn();

    // B: from の 0 時ちょうど、D: to の日の 23 時台（終了は翌日にまたがる）は含まれる
    // A: from の直前、E: to の翌日 0 時ちょうど、G: 期間外は含まれない
    assertThat(reservationIds(result)).containsExactly(RES_B, RES_F, RES_C, RES_D);
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_onlyFrom_includesFromOnward() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-04-15"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(reservationIds(result)).containsExactly(RES_F, RES_C, RES_D, RES_E, RES_G);
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_onlyTo_includesUpToToInclusive() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("to", "2037-04-01"))
            .andExpect(status().isOk())
            .andReturn();

    // 2037-04-01 までに開始する自分のデータは A と B（他のテストクラスのデータは対象外にする）
    assertThat(reservationIds(result)).contains(RES_A, RES_B);
    assertThat(reservationIds(result)).doesNotContain(RES_F, RES_C, RES_D, RES_E, RES_G);
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_startInPeriodButEndsAfter_isIncluded() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-04-30").param("to", "2037-04-30"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(reservationIds(result)).containsExactly(RES_D);
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_noMatchingReservations_returnsHeaderOnly() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2099-01-01").param("to", "2099-12-31"))
            .andExpect(status().isOk())
            .andReturn();

    byte[] bytes = result.getResponse().getContentAsByteArray();
    assertThat(Arrays.copyOfRange(bytes, 0, 3))
        .containsExactly((byte) 0xEF, (byte) 0xBB, (byte) 0xBF);
    assertThat(body(result)).isEqualTo(HEADER_LINE + "\r\n");
  }

  // ---------------------------------------------------------------------------
  // ステータスの絞り込み
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_multipleStatuses_includesAnyOfThem() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                get(CSV_URL)
                    .param("from", "2037-04-01")
                    .param("to", "2037-05-31")
                    .param("status", "APPROVED", "PENDING"))
            .andExpect(status().isOk())
            .andReturn();

    // D（REJECTED）と E（CANCELLED）は含まれない
    assertThat(reservationIds(result)).containsExactly(RES_B, RES_F, RES_C);
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_singleStatus_includesOnlyThatStatus() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                get(CSV_URL)
                    .param("from", "2037-04-01")
                    .param("to", "2037-05-31")
                    .param("status", "REJECTED"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(reservationIds(result)).containsExactly(RES_D);
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_periodAndStatus_areCombinedWithAnd() throws Exception {
    // E（CANCELLED）は 2037-05-01 開始のため、4 月の期間では該当なし
    MvcResult result =
        mockMvc
            .perform(
                get(CSV_URL)
                    .param("from", "2037-04-01")
                    .param("to", "2037-04-30")
                    .param("status", "CANCELLED"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(body(result)).isEqualTo(HEADER_LINE + "\r\n");
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_noStatus_includesAllStatuses() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-04-01").param("to", "2037-05-31"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(reservationIds(result)).containsExactly(RES_B, RES_F, RES_C, RES_D, RES_E);
  }

  // ---------------------------------------------------------------------------
  // 並び順
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_sameStartAt_sortedByIdAscendingNotInsertionOrder() throws Exception {
    // C を先に挿入したが、同じ開始日時の F（ID が小さい）が先に並ぶ
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-04-15").param("to", "2037-04-15"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(reservationIds(result)).containsExactly(RES_F, RES_C);
  }

  // ---------------------------------------------------------------------------
  // CSV インジェクション対策が本文に効いていること
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_purposeStartingWithEquals_isPrefixedWithSingleQuote() throws Exception {
    MvcResult result =
        mockMvc
            .perform(get(CSV_URL).param("from", "2037-06-01").param("to", "2037-06-01"))
            .andExpect(status().isOk())
            .andReturn();

    assertThat(lines(result))
        .containsExactly(
            HEADER_LINE,
            RES_G + ",第1会議室72,山田 太郎,2037-06-01 09:00:00,2037-06-01 10:00:00,'=1+1,承認済み");
  }

  // ---------------------------------------------------------------------------
  // 入力検証（400）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void reservationsCsv_fromAfterTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(CSV_URL).param("from", "2037-04-30").param("to", "2037-04-01"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_sameFromAndTo_isAccepted() throws Exception {
    mockMvc
        .perform(get(CSV_URL).param("from", "2037-04-15").param("to", "2037-04-15"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_invalidFrom_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(CSV_URL).param("from", "not-a-date"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_dateTimeInsteadOfDate_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(CSV_URL).param("to", "2037-04-30T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void reservationsCsv_unknownStatus_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(CSV_URL).param("status", "UNKNOWN"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  // ---------------------------------------------------------------------------
  // 認可
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void reservationsCsv_withMember_returns403WithJsonError() throws Exception {
    mockMvc
        .perform(get(CSV_URL))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void reservationsCsv_withApprover_returns403WithJsonError() throws Exception {
    mockMvc
        .perform(get(CSV_URL))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void reservationsCsv_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get(CSV_URL))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  // ---------------------------------------------------------------------------
  // ヘルパー
  // ---------------------------------------------------------------------------

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

  private void insertResource(UUID id, String name, String category) {
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        id,
        name,
        category,
        false,
        true,
        CREATED_AT);
  }

  /** 終了日時は開始日時の 1 時間後（開始と終了は {@code end_at > start_at} の CHECK 制約を満たす）。 */
  private void insertReservation(
      UUID id,
      UUID resourceId,
      UUID requesterId,
      LocalDateTime startAt,
      String purpose,
      String status) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        resourceId,
        requesterId,
        startAt,
        startAt.plusHours(1),
        purpose,
        status,
        CREATED_AT,
        CREATED_AT);
  }

  private static LocalDateTime at(int y, int mo, int d, int h, int mi, int s) {
    return LocalDateTime.of(y, mo, d, h, mi, s);
  }

  /** BOM を除いた本文（UTF-8）。 */
  private static String body(MvcResult result) throws Exception {
    byte[] bytes = result.getResponse().getContentAsByteArray();
    return new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
  }

  /** 本文を CRLF で分割した行（末尾の空行は含まない）。 */
  private static List<String> lines(MvcResult result) throws Exception {
    String body = body(result);
    return Arrays.stream(body.split("\r\n")).filter(line -> !line.isEmpty()).toList();
  }

  /** データ行（ヘッダ行を除く）の先頭列（予約 ID）を出力順に返す。 */
  private static List<UUID> reservationIds(MvcResult result) throws Exception {
    return lines(result).stream()
        .skip(1)
        .map(line -> line.substring(0, 36))
        .map(UUID::fromString)
        .filter(ALL_RESERVATIONS::contains)
        .toList();
  }
}
