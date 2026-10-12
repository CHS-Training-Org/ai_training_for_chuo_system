package com.example.bookflow.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
import com.example.bookflow.support.WithMockApprover;
import com.example.bookflow.support.WithMockMember;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link StatisticsController} 結合テスト（api-spec.md §統計 準拠）。
 *
 * <p>ADMIN のみが利用実績を取得でき、{@code APPROVED} のみの集計・期間重複と切り詰め・0 件のリソースの含め方・並び順が 仕様どおりであることを確認する。H2
 * を他の結合テストと共有するため、リソース名の接頭辞 {@code 利用実績テスト} で自分のリソースだけを取り出して検証する。 認可は {@code @WithMock*} のデフォルト sub
 * に対応する users 行を seed する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class StatisticsControllerTest extends BaseControllerTest {

  private static final String URL = "/api/statistics/resources";
  private static final String PREFIX = "利用実績テスト";
  private static final String NAME_A = PREFIX + "A";
  private static final String NAME_B = PREFIX + "B";
  private static final String NAME_IDLE = PREFIX + "無実績";
  private static final String NAME_INACTIVE_USED = PREFIX + "無効使用";
  private static final String NAME_INACTIVE_UNUSED = PREFIX + "無効未使用";

  // ---- テスト用固定 ID（73xxxxxx プレフィックスで他テストと分離）----
  private static final UUID DEPT_ID = UUID.fromString("73000000-0000-0000-0000-000000000001");
  private static final UUID REQUESTER_ID = UUID.fromString("73000000-0000-0000-0000-000000000002");
  private static final UUID ADMIN_AUTH_ID = UUID.fromString("73000000-0000-0000-0000-000000000003");
  private static final UUID MEMBER_AUTH_ID =
      UUID.fromString("73000000-0000-0000-0000-000000000004");
  private static final UUID APPROVER_AUTH_ID =
      UUID.fromString("73000000-0000-0000-0000-000000000005");
  private static final UUID RES_A_ID = UUID.fromString("73000000-0000-0000-0000-000000000010");
  private static final UUID RES_B_ID = UUID.fromString("73000000-0000-0000-0000-000000000011");
  private static final UUID RES_IDLE_ID = UUID.fromString("73000000-0000-0000-0000-000000000012");
  private static final UUID RES_INACTIVE_USED_ID =
      UUID.fromString("73000000-0000-0000-0000-000000000013");
  private static final UUID RES_INACTIVE_UNUSED_ID =
      UUID.fromString("73000000-0000-0000-0000-000000000014");

  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2025, 4, 1, 9, 0, 0);

  private final List<UUID> insertedReservationIds = new ArrayList<>();

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "統計テスト部署");
    insertUser(
        REQUESTER_ID, "stats-requester-73", "統計 申請者", "stats-requester73@example.com", "MEMBER");
    // RegisteredUserInterceptor が照合する認証ユーザー（@WithMock* のデフォルト sub に対応）
    insertUser(ADMIN_AUTH_ID, "test-admin-sub", "テスト管理者", "stats-admin73@example.com", "ADMIN");
    insertUser(MEMBER_AUTH_ID, "test-member-sub", "テスト会員", "stats-member73@example.com", "MEMBER");
    insertUser(
        APPROVER_AUTH_ID,
        "test-approver-sub",
        "テスト承認者",
        "stats-approver73@example.com",
        "APPROVER");

    insertResource(RES_A_ID, NAME_A, true);
    insertResource(RES_B_ID, NAME_B, true);
    insertResource(RES_IDLE_ID, NAME_IDLE, true);
    insertResource(RES_INACTIVE_USED_ID, NAME_INACTIVE_USED, false);
    insertResource(RES_INACTIVE_UNUSED_ID, NAME_INACTIVE_UNUSED, false);

    // A：承認済み 3 件（2030-10-10 09:00-11:00 = 120 分、2030-10-20 13:00-14:30 = 90 分、
    //   過去の 2020-01-01 09:00-10:00 = 60 分）と、承認済み以外 4 件
    insertReservation(
        1,
        RES_A_ID,
        LocalDateTime.of(2030, 10, 10, 9, 0),
        LocalDateTime.of(2030, 10, 10, 11, 0),
        "APPROVED");
    insertReservation(
        2,
        RES_A_ID,
        LocalDateTime.of(2030, 10, 20, 13, 0),
        LocalDateTime.of(2030, 10, 20, 14, 30),
        "APPROVED");
    insertReservation(
        3,
        RES_A_ID,
        LocalDateTime.of(2020, 1, 1, 9, 0),
        LocalDateTime.of(2020, 1, 1, 10, 0),
        "APPROVED");
    insertReservation(
        4,
        RES_A_ID,
        LocalDateTime.of(2030, 10, 11, 9, 0),
        LocalDateTime.of(2030, 10, 11, 12, 0),
        "PENDING");
    insertReservation(
        5,
        RES_A_ID,
        LocalDateTime.of(2030, 10, 12, 9, 0),
        LocalDateTime.of(2030, 10, 12, 12, 0),
        "REJECTED");
    insertReservation(
        6,
        RES_A_ID,
        LocalDateTime.of(2030, 10, 13, 9, 0),
        LocalDateTime.of(2030, 10, 13, 12, 0),
        "CANCELLED");
    insertReservation(
        7,
        RES_A_ID,
        LocalDateTime.of(2030, 10, 14, 9, 0),
        LocalDateTime.of(2030, 10, 14, 12, 0),
        "DRAFT");
    // B：境界をまたぐ承認済み 1 件（2030-09-30 22:00 〜 2030-10-01 02:00 = 全体 240 分）
    insertReservation(
        8,
        RES_B_ID,
        LocalDateTime.of(2030, 9, 30, 22, 0),
        LocalDateTime.of(2030, 10, 1, 2, 0),
        "APPROVED");
    // 無効化済み（使用あり）：承認済み 1 件（2030-10-05 10:00-12:00 = 120 分）
    insertReservation(
        9,
        RES_INACTIVE_USED_ID,
        LocalDateTime.of(2030, 10, 5, 10, 0),
        LocalDateTime.of(2030, 10, 5, 12, 0),
        "APPROVED");
  }

  @AfterEach
  void deleteSeedData() {
    for (UUID id : insertedReservationIds) {
      jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", id);
    }
    insertedReservationIds.clear();
    jdbcTemplate.update(
        "DELETE FROM resources WHERE id IN (?, ?, ?, ?, ?)",
        RES_A_ID,
        RES_B_ID,
        RES_IDLE_ID,
        RES_INACTIVE_USED_ID,
        RES_INACTIVE_UNUSED_ID);
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

  private void insertResource(UUID id, String name, boolean isActive) {
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        id,
        name,
        "ROOM",
        false,
        isActive,
        CREATED_AT);
  }

  private void insertReservation(
      int seq, UUID resourceId, LocalDateTime start, LocalDateTime end, String status) {
    UUID id = UUID.fromString(String.format("73000000-0000-0000-0000-0000000001%02d", seq));
    insertedReservationIds.add(id);
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at,"
            + " updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        resourceId,
        REQUESTER_ID,
        start,
        end,
        "統計テスト",
        status,
        CREATED_AT,
        CREATED_AT);
  }

  /** 集計を取得し、このテストのリソース（名前が接頭辞で始まる）だけを応答の並び順のまま返す。 */
  private List<JsonNode> fetchOwn(String query) throws Exception {
    String body =
        mockMvc
            .perform(get(URL + query).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    List<JsonNode> own = new ArrayList<>();
    for (JsonNode node : objectMapper.readTree(body)) {
      if (node.get("resourceName").asText().startsWith(PREFIX)) {
        own.add(node);
      }
    }
    return own;
  }

  private static JsonNode named(List<JsonNode> nodes, String name) {
    return nodes.stream()
        .filter(n -> n.get("resourceName").asText().equals(name))
        .findFirst()
        .orElse(null);
  }

  private static List<String> names(List<JsonNode> nodes) {
    return nodes.stream().map(n -> n.get("resourceName").asText()).toList();
  }

  // ---------------------------------------------------------------------------
  // 認可（USG-03）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void resources_withMember_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get(URL).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void resources_withApprover_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get(URL).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void resources_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get(URL).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  // ---------------------------------------------------------------------------
  // 期間なし（全期間・全時間）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void resources_noPeriod_returnsArrayWithFourFieldsPerResource() throws Exception {
    JsonNode a = named(fetchOwn(""), NAME_A);

    assertThat(a).isNotNull();
    assertThat(a.get("resourceId").asText()).isEqualTo(RES_A_ID.toString());
    assertThat(a.has("reservationCount")).isTrue();
    assertThat(a.has("totalMinutes")).isTrue();
    assertThat(a.size()).isEqualTo(4);
  }

  @Test
  @WithMockAdmin
  void resources_noPeriod_countsOnlyApprovedAcrossPastAndFuture() throws Exception {
    JsonNode a = named(fetchOwn(""), NAME_A);

    // 承認済み 3 件（120 + 90 + 60 = 270 分）。PENDING・REJECTED・CANCELLED・DRAFT は含まれない
    assertThat(a.get("reservationCount").asLong()).isEqualTo(3);
    assertThat(a.get("totalMinutes").asLong()).isEqualTo(270);
  }

  @Test
  @WithMockAdmin
  void resources_noPeriod_usesFullDurationOfBoundaryCrossingReservation() throws Exception {
    JsonNode b = named(fetchOwn(""), NAME_B);

    assertThat(b.get("reservationCount").asLong()).isEqualTo(1);
    assertThat(b.get("totalMinutes").asLong()).isEqualTo(240);
  }

  @Test
  @WithMockAdmin
  void resources_noPeriod_includesIdleActiveAndUsedInactiveButNotUnusedInactive() throws Exception {
    List<JsonNode> own = fetchOwn("");

    JsonNode idle = named(own, NAME_IDLE);
    assertThat(idle.get("reservationCount").asLong()).isZero();
    assertThat(idle.get("totalMinutes").asLong()).isZero();
    assertThat(named(own, NAME_INACTIVE_USED).get("totalMinutes").asLong()).isEqualTo(120);
    assertThat(named(own, NAME_INACTIVE_UNUSED)).isNull();
  }

  @Test
  @WithMockAdmin
  void resources_noPeriod_sortsByMinutesDescending() throws Exception {
    // A: 270 分、B: 240 分、無効使用: 120 分、無実績: 0 分
    assertThat(names(fetchOwn(""))).containsExactly(NAME_A, NAME_B, NAME_INACTIVE_USED, NAME_IDLE);
  }

  // ---------------------------------------------------------------------------
  // 期間あり（期間重複・切り詰め）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void resources_withPeriod_countsOverlappingReservationsAndClipsMinutes() throws Exception {
    List<JsonNode> own = fetchOwn("?from=2030-10-01T00:00:00&to=2030-11-01T00:00:00");

    JsonNode a = named(own, NAME_A);
    assertThat(a.get("reservationCount").asLong()).isEqualTo(2);
    assertThat(a.get("totalMinutes").asLong()).isEqualTo(210);
    // B は 9/30 22:00 - 10/1 02:00：件数は 1 件、時間は期間内の 2 時間（120 分）に切り詰められる
    JsonNode b = named(own, NAME_B);
    assertThat(b.get("reservationCount").asLong()).isEqualTo(1);
    assertThat(b.get("totalMinutes").asLong()).isEqualTo(120);
  }

  @Test
  @WithMockAdmin
  void resources_withPeriodEndingInsideReservation_clipsAtTo() throws Exception {
    // A の 2030-10-10 09:00-11:00 を 10:00 で切る → 60 分
    JsonNode a = named(fetchOwn("?from=2030-10-10T00:00:00&to=2030-10-10T10:00:00"), NAME_A);

    assertThat(a.get("reservationCount").asLong()).isEqualTo(1);
    assertThat(a.get("totalMinutes").asLong()).isEqualTo(60);
  }

  @Test
  @WithMockAdmin
  void resources_withPeriodTouchingOnlyAtBoundary_excludesAdjacentReservation() throws Exception {
    // B の予約は 2030-10-01 02:00 までで、期間の開始がちょうど 02:00 のときは重複しない
    JsonNode b = named(fetchOwn("?from=2030-10-01T02:00:00&to=2030-10-02T00:00:00"), NAME_B);

    assertThat(b.get("reservationCount").asLong()).isZero();
    assertThat(b.get("totalMinutes").asLong()).isZero();
  }

  @Test
  @WithMockAdmin
  void resources_withPeriodContainingOnlyPending_doesNotCountIt() throws Exception {
    // 2030-10-11 は A の PENDING のみ
    JsonNode a = named(fetchOwn("?from=2030-10-11T00:00:00&to=2030-10-12T00:00:00"), NAME_A);

    assertThat(a.get("reservationCount").asLong()).isZero();
  }

  @Test
  @WithMockAdmin
  void resources_withPeriodWithoutAnyUsage_keepsActiveResourcesAndDropsInactive() throws Exception {
    List<JsonNode> own = fetchOwn("?from=2040-01-01T00:00:00&to=2040-02-01T00:00:00");

    assertThat(names(own)).containsExactlyInAnyOrder(NAME_A, NAME_B, NAME_IDLE);
    assertThat(own).allSatisfy(n -> assertThat(n.get("totalMinutes").asLong()).isZero());
  }

  @Test
  @WithMockAdmin
  void resources_withPeriodThatHasUsedInactiveResource_includesIt() throws Exception {
    List<JsonNode> own = fetchOwn("?from=2030-10-05T00:00:00&to=2030-10-06T00:00:00");

    assertThat(named(own, NAME_INACTIVE_USED).get("totalMinutes").asLong()).isEqualTo(120);
    assertThat(named(own, NAME_INACTIVE_UNUSED)).isNull();
  }

  // ---------------------------------------------------------------------------
  // from / to の検証（400）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void resources_withOnlyFrom_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL + "?from=2030-10-01T00:00:00").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.message").value("from と to は同時に指定してください。"));
  }

  @Test
  @WithMockAdmin
  void resources_withOnlyTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get(URL + "?to=2030-10-31T00:00:00").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockAdmin
  void resources_withFromAfterTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(
            get(URL + "?from=2030-10-10T12:00:00&to=2030-10-10T10:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
        .andExpect(jsonPath("$.message").value("from は to より前にしてください。"));
  }

  @Test
  @WithMockAdmin
  void resources_withFromEqualToTo_returns400ValidationError() throws Exception {
    mockMvc
        .perform(
            get(URL + "?from=2030-10-10T10:00:00&to=2030-10-10T10:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  // ---------------------------------------------------------------------------
  // OpenAPI への反映
  // ---------------------------------------------------------------------------

  @Test
  void apiDocs_includesStatisticsEndpoint() throws Exception {
    String docs =
        mockMvc
            .perform(get("/v3/api-docs").accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(docs).contains("/api/statistics/resources");
  }
}
