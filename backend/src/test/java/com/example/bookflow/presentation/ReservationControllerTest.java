package com.example.bookflow.presentation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
import com.example.bookflow.support.WithMockApprover;
import com.example.bookflow.support.WithMockMember;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link ReservationController} 結合テスト（api-spec.md §予約 準拠）。
 *
 * <p>テストデータは {@link JdbcTemplate} で直接挿入・削除し、H2 インメモリ DB を使用する。 重複チェック・requires_approval
 * 分岐・所有権制御・ステータスガードのエンドツーエンドを確認する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReservationControllerTest extends BaseControllerTest {

  // ---- テスト用固定 ID ----
  private static final UUID DEPT_ID = UUID.fromString("30000000-0000-0000-0000-000000000001");

  /** MEMBER（本人）: sub = "test-member-sub" */
  private static final UUID MEMBER_ID = UUID.fromString("30000000-0000-0000-0000-000000000002");

  /** 別 MEMBER（他人）: sub = "other-member-sub" */
  private static final UUID OTHER_MEMBER_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000003");

  /** ADMIN: sub = "test-admin-sub" */
  private static final UUID ADMIN_ID = UUID.fromString("30000000-0000-0000-0000-000000000004");

  /** APPROVER: sub = "test-approver-sub"（requires_approval=true の申請で承認ステップ生成に必要） */
  private static final UUID APPROVER_ID = UUID.fromString("30000000-0000-0000-0000-000000000005");

  /** 承認不要リソース */
  private static final UUID RESOURCE_NO_APPROVAL_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000010");

  /** 承認要リソース */
  private static final UUID RESOURCE_WITH_APPROVAL_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000011");

  /** MEMBER が所有する APPROVED 予約（2025-06-10 10:00-12:00） */
  private static final UUID RESERVATION_MEMBER_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000020");

  /** OTHER_MEMBER が所有する PENDING 予約（2025-06-11 09:00-11:00） */
  private static final UUID RESERVATION_OTHER_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000021");

  /** MEMBER の PENDING 予約（後で UPDATE/CANCEL テストに使用・2025-06-12 14:00-16:00） */
  private static final UUID RESERVATION_PENDING_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000022");

  /** MEMBER の下書き（承認不要リソース・2025-06-13 10:00-12:00） */
  private static final UUID DRAFT_NO_APPROVAL_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000023");

  /** MEMBER の下書き（承認要リソース・2025-06-14 10:00-12:00） */
  private static final UUID DRAFT_WITH_APPROVAL_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000024");

  /** OTHER_MEMBER の下書き（承認不要リソース・2025-06-15 10:00-12:00） */
  private static final UUID DRAFT_OTHER_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000025");

  /** ADMIN 本人の下書き（テスト内で挿入・2025-06-16 10:00-12:00） */
  private static final UUID DRAFT_ADMIN_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000026");

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
        "member@example.com",
        DEPT_ID,
        "MEMBER",
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        OTHER_MEMBER_ID,
        "other-member-sub",
        "別会員",
        "other@example.com",
        DEPT_ID,
        "MEMBER",
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        ADMIN_ID,
        "test-admin-sub",
        "管理者",
        "admin@example.com",
        DEPT_ID,
        "ADMIN",
        LocalDateTime.of(2025, 4, 1, 9, 0));
    // APPROVER を seed（requires_approval=true の POST 申請時に ApprovalService が承認者を検索する）
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        APPROVER_ID,
        "test-approver-sub",
        "承認者",
        "approver@example.com",
        DEPT_ID,
        "APPROVER",
        LocalDateTime.of(2025, 4, 1, 9, 0));

    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_NO_APPROVAL_ID,
        "即時確定会議室",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_WITH_APPROVAL_ID,
        "承認必要会議室",
        "ROOM",
        true,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));

    // MEMBER の APPROVED 予約（2025-06-10 10:00-12:00）
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_MEMBER_ID,
        RESOURCE_NO_APPROVAL_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 6, 10, 10, 0),
        LocalDateTime.of(2025, 6, 10, 12, 0),
        "MEMBER の確定予約",
        "APPROVED",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));

    // OTHER_MEMBER の PENDING 予約（2025-06-11 09:00-11:00）
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_OTHER_ID,
        RESOURCE_NO_APPROVAL_ID,
        OTHER_MEMBER_ID,
        LocalDateTime.of(2025, 6, 11, 9, 0),
        LocalDateTime.of(2025, 6, 11, 11, 0),
        "他会員の予約",
        "PENDING",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));

    // MEMBER の PENDING 予約（2025-06-12 14:00-16:00）
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_PENDING_ID,
        RESOURCE_WITH_APPROVAL_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 6, 12, 14, 0),
        LocalDateTime.of(2025, 6, 12, 16, 0),
        "MEMBER の承認待ち予約",
        "PENDING",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));

    // 下書き（DRAFT）。承認ステップは持たない
    insertReservation(
        DRAFT_NO_APPROVAL_ID,
        RESOURCE_NO_APPROVAL_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 6, 13, 10, 0),
        LocalDateTime.of(2025, 6, 13, 12, 0),
        "MEMBER の下書き（承認不要）",
        "DRAFT");
    insertReservation(
        DRAFT_WITH_APPROVAL_ID,
        RESOURCE_WITH_APPROVAL_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 6, 14, 10, 0),
        LocalDateTime.of(2025, 6, 14, 12, 0),
        "MEMBER の下書き（承認要）",
        "DRAFT");
    insertReservation(
        DRAFT_OTHER_ID,
        RESOURCE_NO_APPROVAL_ID,
        OTHER_MEMBER_ID,
        LocalDateTime.of(2025, 6, 15, 10, 0),
        LocalDateTime.of(2025, 6, 15, 12, 0),
        "他会員の下書き",
        "DRAFT");
  }

  private void insertReservation(
      UUID id,
      UUID resourceId,
      UUID requesterId,
      LocalDateTime startAt,
      LocalDateTime endAt,
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
        endAt,
        purpose,
        status,
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));
  }

  private String statusOf(UUID reservationId) {
    return jdbcTemplate.queryForObject(
        "SELECT status FROM reservations WHERE id = ?", String.class, reservationId);
  }

  private int countReservations(UUID reservationId) {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM reservations WHERE id = ?", Integer.class, reservationId);
    return count == null ? 0 : count;
  }

  private int countApprovalSteps(UUID reservationId) {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM approval_steps WHERE reservation_id = ?",
            Integer.class,
            reservationId);
    return count == null ? 0 : count;
  }

  @AfterEach
  void deleteSeedData() {
    // FK 逆順に削除：approval_steps → reservations → resources → users → departments
    // approval_steps は create() が requires_approval=true のとき生成するため必ず先に削除する
    jdbcTemplate.update(
        "DELETE FROM approval_steps WHERE reservation_id IN (?, ?, ?)",
        RESERVATION_MEMBER_ID,
        RESERVATION_OTHER_ID,
        RESERVATION_PENDING_ID);
    // テスト内で追加された予約（POST テスト等）の approval_steps も削除
    jdbcTemplate.update(
        "DELETE FROM approval_steps WHERE reservation_id IN"
            + " (SELECT id FROM reservations WHERE requester_id = ?)",
        MEMBER_ID);
    jdbcTemplate.update(
        "DELETE FROM reservations WHERE id IN (?, ?, ?)",
        RESERVATION_MEMBER_ID,
        RESERVATION_OTHER_ID,
        RESERVATION_PENDING_ID);
    // POST テストで追加された動的予約も削除
    jdbcTemplate.update("DELETE FROM reservations WHERE requester_id = ?", MEMBER_ID);
    // 他会員と ADMIN の下書き（初期データ・テスト内で挿入したもの）も削除
    jdbcTemplate.update(
        "DELETE FROM reservations WHERE requester_id IN (?, ?)", OTHER_MEMBER_ID, ADMIN_ID);
    jdbcTemplate.update(
        "DELETE FROM resources WHERE id IN (?, ?)",
        RESOURCE_NO_APPROVAL_ID,
        RESOURCE_WITH_APPROVAL_ID);
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?, ?)",
        MEMBER_ID,
        OTHER_MEMBER_ID,
        ADMIN_ID,
        APPROVER_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // POST /api/reservations — 予約申請
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void create_noApprovalRequiredResource_returns201Approved() throws Exception {
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-07-01T10:00:00",
          "endAt": "2025-07-01T12:00:00",
          "purpose": "週次ミーティング",
          "attendeesCount": 5
        }
        """
            .formatted(RESOURCE_NO_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("APPROVED"))
        .andExpect(jsonPath("$.resourceId").value(RESOURCE_NO_APPROVAL_ID.toString()))
        .andExpect(jsonPath("$.id").isNotEmpty());

    // クリーンアップ（created_at が unknown なので requester_id で削除）
    jdbcTemplate.update(
        "DELETE FROM reservations WHERE requester_id = ? AND start_at = ?",
        MEMBER_ID,
        LocalDateTime.of(2025, 7, 1, 10, 0));
  }

  @Test
  @WithMockMember
  void create_approvalRequiredResource_returns201Pending() throws Exception {
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-07-02T10:00:00",
          "endAt": "2025-07-02T12:00:00",
          "purpose": "承認が必要な会議"
        }
        """
            .formatted(RESOURCE_WITH_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("PENDING"));

    // requires_approval=true のため approval_step が生成される → FK 逆順で削除
    jdbcTemplate.update(
        "DELETE FROM approval_steps WHERE reservation_id IN"
            + " (SELECT id FROM reservations WHERE requester_id = ? AND start_at = ?)",
        MEMBER_ID,
        LocalDateTime.of(2025, 7, 2, 10, 0));
    jdbcTemplate.update(
        "DELETE FROM reservations WHERE requester_id = ? AND start_at = ?",
        MEMBER_ID,
        LocalDateTime.of(2025, 7, 2, 10, 0));
  }

  @Test
  @WithMockMember
  void create_conflictWithExistingReservation_returns409() throws Exception {
    // RESERVATION_MEMBER_ID（2025-06-10 10:00-12:00）と重複
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-06-10T11:00:00",
          "endAt": "2025-06-10T13:00:00",
          "purpose": "重複テスト"
        }
        """
            .formatted(RESOURCE_NO_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));
  }

  @Test
  void create_unauthenticated_returns401() throws Exception {
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-07-01T10:00:00",
          "endAt": "2025-07-01T12:00:00",
          "purpose": "テスト"
        }
        """
            .formatted(RESOURCE_NO_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockMember
  void create_draftTrue_returns201DraftWithoutApprovalStepOrConflictCheck() throws Exception {
    // 下書きは重複判定をしない。同じリソースの RESERVATION_MEMBER_ID（APPROVED・2025-06-10 10:00-12:00）と
    // 重なる時間帯でも保存できる。
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-06-10T11:00:00",
          "endAt": "2025-06-10T13:00:00",
          "purpose": "重複していても保存できる下書き",
          "draft": true
        }
        """
            .formatted(RESOURCE_NO_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("DRAFT"))
        .andExpect(jsonPath("$.purpose").value("重複していても保存できる下書き"));
  }

  @Test
  @WithMockMember
  void create_draftTrueOnApprovalRequiredResource_returns201DraftAndNoApprovalStep()
      throws Exception {
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-07-03T10:00:00",
          "endAt": "2025-07-03T12:00:00",
          "purpose": "承認要リソースの下書き",
          "draft": true
        }
        """
            .formatted(RESOURCE_WITH_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("DRAFT"));

    Integer steps =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM approval_steps WHERE reservation_id IN"
                + " (SELECT id FROM reservations WHERE requester_id = ? AND start_at = ?)",
            Integer.class,
            MEMBER_ID,
            LocalDateTime.of(2025, 7, 3, 10, 0));
    assertThat(steps).isZero();
  }

  @Test
  @WithMockMember
  void create_draftTrueWithoutPurpose_returns400() throws Exception {
    // 下書きでも必須項目の検証は同じ
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-07-04T10:00:00",
          "endAt": "2025-07-04T12:00:00",
          "draft": true
        }
        """
            .formatted(RESOURCE_NO_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest());
  }

  // ---------------------------------------------------------------------------
  // GET /api/reservations — 予約一覧
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void list_memberAccess_returnsOwnReservationsOnly() throws Exception {
    mockMvc
        .perform(get("/api/reservations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_OTHER_ID)).doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_adminAccess_returnsAllReservations() throws Exception {
    mockMvc
        .perform(get("/api/reservations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_MEMBER_ID)).exists())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_OTHER_ID)).exists());
  }

  @Test
  @WithMockMember
  void list_withStatusFilter_returnsFilteredReservations() throws Exception {
    // MEMBER 視点で APPROVED のみ → RESERVATION_MEMBER_ID のみ
    mockMvc
        .perform(get("/api/reservations").param("status", "APPROVED"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_PENDING_ID))
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_noStatus_excludesDrafts() throws Exception {
    mockMvc
        .perform(get("/api/reservations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_NO_APPROVAL_ID)).doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_WITH_APPROVAL_ID))
                .doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_noStatusAsAdmin_excludesDrafts() throws Exception {
    mockMvc
        .perform(get("/api/reservations"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_OTHER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_NO_APPROVAL_ID)).doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_OTHER_ID)).doesNotExist());
  }

  @Test
  @WithMockMember
  void list_statusDraft_returnsOwnDraftsOnly() throws Exception {
    mockMvc
        .perform(get("/api/reservations").param("status", "DRAFT"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_NO_APPROVAL_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_WITH_APPROVAL_ID)).exists())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_OTHER_ID)).doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_MEMBER_ID)).doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_statusDraftAsAdmin_returnsAllUsersDrafts() throws Exception {
    mockMvc
        .perform(get("/api/reservations").param("status", "DRAFT"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_NO_APPROVAL_ID)).exists())
        .andExpect(jsonPath("$.content[?(@.id == '%s')]".formatted(DRAFT_OTHER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_OTHER_ID)).doesNotExist());
  }

  // ---------------------------------------------------------------------------
  // GET /api/reservations/{id} — 予約詳細
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void get_ownReservation_returns200() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + RESERVATION_MEMBER_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(RESERVATION_MEMBER_ID.toString()))
        .andExpect(jsonPath("$.status").value("APPROVED"));
  }

  @Test
  @WithMockMember
  void get_otherMemberReservation_returns403() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + RESERVATION_OTHER_ID))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockAdmin
  void get_adminAccessOtherReservation_returns200() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + RESERVATION_OTHER_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(RESERVATION_OTHER_ID.toString()));
  }

  @Test
  @WithMockMember
  void get_nonExistentId_returns404() throws Exception {
    mockMvc.perform(get("/api/reservations/" + UUID.randomUUID())).andExpect(status().isNotFound());
  }

  @Test
  @WithMockMember
  void get_ownDraft_returns200() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + DRAFT_NO_APPROVAL_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"));
  }

  @Test
  @WithMockMember
  void get_otherMemberDraftByMember_returns403() throws Exception {
    mockMvc.perform(get("/api/reservations/" + DRAFT_OTHER_ID)).andExpect(status().isForbidden());
  }

  @Test
  @WithMockApprover
  void get_otherMemberDraftByApprover_returns403() throws Exception {
    // APPROVER は、下書き以外は全件参照できるが、他人の下書きは参照できない
    mockMvc.perform(get("/api/reservations/" + DRAFT_OTHER_ID)).andExpect(status().isForbidden());
    mockMvc.perform(get("/api/reservations/" + RESERVATION_OTHER_ID)).andExpect(status().isOk());
  }

  @Test
  @WithMockAdmin
  void get_otherMemberDraftByAdmin_returns200() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + DRAFT_OTHER_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"));
  }

  // ---------------------------------------------------------------------------
  // PUT /api/reservations/{id} — 予約更新
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void update_pendingReservationByOwner_returns200() throws Exception {
    String body =
        """
        {
          "startAt": "2025-06-12T15:00:00",
          "endAt": "2025-06-12T17:00:00",
          "purpose": "更新後の会議"
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + RESERVATION_PENDING_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.purpose").value("更新後の会議"));
  }

  @Test
  @WithMockMember
  void update_approvedReservation_returns422() throws Exception {
    // RESERVATION_MEMBER_ID は APPROVED
    String body =
        """
        {
          "startAt": "2025-06-10T14:00:00",
          "endAt": "2025-06-10T16:00:00",
          "purpose": "変更テスト"
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + RESERVATION_MEMBER_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isUnprocessableEntity());
  }

  @Test
  @WithMockMember
  void update_otherMemberReservation_returns403() throws Exception {
    String body =
        """
        {
          "startAt": "2025-06-11T09:00:00",
          "endAt": "2025-06-11T11:00:00",
          "purpose": "他人の予約を更新しようとする"
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + RESERVATION_OTHER_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockMember
  void update_nonExistentReservation_returns404() throws Exception {
    String body =
        """
        {
          "startAt": "2025-07-01T10:00:00",
          "endAt": "2025-07-01T12:00:00",
          "purpose": "テスト"
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockMember
  void update_draftWithDraftTrue_returns200AndStaysDraft() throws Exception {
    String body =
        """
        {
          "startAt": "2025-06-13T14:00:00",
          "endAt": "2025-06-13T16:00:00",
          "purpose": "下書きの更新",
          "draft": true
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + DRAFT_NO_APPROVAL_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"))
        .andExpect(jsonPath("$.purpose").value("下書きの更新"));
    assertThat(statusOf(DRAFT_NO_APPROVAL_ID)).isEqualTo("DRAFT");
  }

  @Test
  @WithMockMember
  void update_draftSubmitOnNoApprovalResource_returns200Approved() throws Exception {
    // draft を指定しない PUT は、下書きの正式申請になる（承認不要リソースは APPROVED）
    String body =
        """
        {
          "startAt": "2025-06-13T10:00:00",
          "endAt": "2025-06-13T12:00:00",
          "purpose": "正式申請"
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + DRAFT_NO_APPROVAL_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APPROVED"));
    assertThat(countApprovalSteps(DRAFT_NO_APPROVAL_ID)).isZero();
  }

  @Test
  @WithMockMember
  void update_draftSubmitOnApprovalRequiredResource_returns200PendingAndCreatesApprovalStep()
      throws Exception {
    // 受入条件: 下書き（DRAFT）から承認待ち（PENDING）への遷移
    String body =
        """
        {
          "startAt": "2025-06-14T10:00:00",
          "endAt": "2025-06-14T12:00:00",
          "purpose": "承認が必要な正式申請",
          "draft": false
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + DRAFT_WITH_APPROVAL_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PENDING"));
    assertThat(statusOf(DRAFT_WITH_APPROVAL_ID)).isEqualTo("PENDING");
    assertThat(countApprovalSteps(DRAFT_WITH_APPROVAL_ID)).isEqualTo(1);
  }

  @Test
  @WithMockMember
  void update_draftSubmitWithConflict_returns409AndKeepsDraft() throws Exception {
    // RESERVATION_MEMBER_ID（承認不要リソース・2025-06-10 10:00-12:00）と重なる時間帯で正式申請
    String body =
        """
        {
          "startAt": "2025-06-10T11:00:00",
          "endAt": "2025-06-10T13:00:00",
          "purpose": "重複する正式申請"
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + DRAFT_NO_APPROVAL_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));
    assertThat(statusOf(DRAFT_NO_APPROVAL_ID)).isEqualTo("DRAFT");
  }

  @Test
  @WithMockMember
  void update_pendingWithDraftTrue_returns422() throws Exception {
    String body =
        """
        {
          "startAt": "2025-06-12T14:00:00",
          "endAt": "2025-06-12T16:00:00",
          "purpose": "承認待ちを下書きにしようとする",
          "draft": true
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + RESERVATION_PENDING_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isUnprocessableEntity());
    assertThat(statusOf(RESERVATION_PENDING_ID)).isEqualTo("PENDING");
  }

  @Test
  @WithMockMember
  void update_otherMemberDraft_returns403() throws Exception {
    String body =
        """
        {
          "startAt": "2025-06-15T10:00:00",
          "endAt": "2025-06-15T12:00:00",
          "purpose": "他人の下書きを更新しようとする",
          "draft": true
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + DRAFT_OTHER_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockAdmin
  void update_otherMemberDraftByAdmin_returns403() throws Exception {
    // ADMIN も、他人の下書きは更新できない（閲覧のみ）
    String body =
        """
        {
          "startAt": "2025-06-13T10:00:00",
          "endAt": "2025-06-13T12:00:00",
          "purpose": "管理者による更新",
          "draft": true
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + DRAFT_NO_APPROVAL_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockAdmin
  void update_ownDraftByAdmin_returns200() throws Exception {
    // ADMIN も、自分の下書きなら更新できる
    insertReservation(
        DRAFT_ADMIN_ID,
        RESOURCE_NO_APPROVAL_ID,
        ADMIN_ID,
        LocalDateTime.of(2025, 6, 16, 10, 0),
        LocalDateTime.of(2025, 6, 16, 12, 0),
        "管理者の下書き",
        "DRAFT");
    String body =
        """
        {
          "startAt": "2025-06-16T13:00:00",
          "endAt": "2025-06-16T15:00:00",
          "purpose": "管理者が自分の下書きを更新",
          "draft": true
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + DRAFT_ADMIN_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"));
  }

  // ---------------------------------------------------------------------------
  // POST /api/reservations/{id}/cancel — キャンセル
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void cancel_pendingReservationByOwner_returnsCancelled() throws Exception {
    mockMvc
        .perform(post("/api/reservations/" + RESERVATION_PENDING_ID + "/cancel"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"));
  }

  @Test
  @WithMockAdmin
  void cancel_otherMemberReservationByAdmin_returnsCancelled() throws Exception {
    mockMvc
        .perform(post("/api/reservations/" + RESERVATION_OTHER_ID + "/cancel"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"));
  }

  @Test
  @WithMockMember
  void cancel_otherMemberReservationByMember_returns403() throws Exception {
    mockMvc
        .perform(post("/api/reservations/" + RESERVATION_OTHER_ID + "/cancel"))
        .andExpect(status().isForbidden());
  }

  @Test
  void cancel_unauthenticated_returns401() throws Exception {
    mockMvc
        .perform(post("/api/reservations/" + RESERVATION_PENDING_ID + "/cancel"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockMember
  void cancel_draftByOwner_returns422() throws Exception {
    // 下書きは取消の対象外（破棄するときは削除を使う）
    mockMvc
        .perform(post("/api/reservations/" + DRAFT_NO_APPROVAL_ID + "/cancel"))
        .andExpect(status().isUnprocessableEntity());
    assertThat(statusOf(DRAFT_NO_APPROVAL_ID)).isEqualTo("DRAFT");
  }

  // ---------------------------------------------------------------------------
  // DELETE /api/reservations/{id} — 下書きの削除
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void delete_ownDraft_returns204AndRemovesReservation() throws Exception {
    mockMvc
        .perform(delete("/api/reservations/" + DRAFT_NO_APPROVAL_ID))
        .andExpect(status().isNoContent());
    assertThat(countReservations(DRAFT_NO_APPROVAL_ID)).isZero();
  }

  @Test
  @WithMockAdmin
  void delete_ownDraftByAdmin_returns204() throws Exception {
    // ADMIN も、自分の下書きなら削除できる
    insertReservation(
        DRAFT_ADMIN_ID,
        RESOURCE_NO_APPROVAL_ID,
        ADMIN_ID,
        LocalDateTime.of(2025, 6, 16, 10, 0),
        LocalDateTime.of(2025, 6, 16, 12, 0),
        "管理者の下書き",
        "DRAFT");

    mockMvc
        .perform(delete("/api/reservations/" + DRAFT_ADMIN_ID))
        .andExpect(status().isNoContent());
    assertThat(countReservations(DRAFT_ADMIN_ID)).isZero();
  }

  @Test
  @WithMockMember
  void delete_otherMemberDraft_returns403() throws Exception {
    mockMvc
        .perform(delete("/api/reservations/" + DRAFT_OTHER_ID))
        .andExpect(status().isForbidden());
    assertThat(countReservations(DRAFT_OTHER_ID)).isEqualTo(1);
  }

  @Test
  @WithMockAdmin
  void delete_otherMemberDraftByAdmin_returns403() throws Exception {
    // ADMIN も、他人の下書きは削除できない
    mockMvc
        .perform(delete("/api/reservations/" + DRAFT_NO_APPROVAL_ID))
        .andExpect(status().isForbidden());
    assertThat(countReservations(DRAFT_NO_APPROVAL_ID)).isEqualTo(1);
  }

  @Test
  @WithMockMember
  void delete_pendingReservation_returns422() throws Exception {
    mockMvc
        .perform(delete("/api/reservations/" + RESERVATION_PENDING_ID))
        .andExpect(status().isUnprocessableEntity());
    assertThat(countReservations(RESERVATION_PENDING_ID)).isEqualTo(1);
  }

  @Test
  @WithMockMember
  void delete_nonExistentReservation_returns404() throws Exception {
    mockMvc
        .perform(delete("/api/reservations/" + UUID.randomUUID()))
        .andExpect(status().isNotFound());
  }

  @Test
  void delete_unauthenticated_returns401() throws Exception {
    mockMvc
        .perform(delete("/api/reservations/" + DRAFT_NO_APPROVAL_ID))
        .andExpect(status().isUnauthorized());
  }
}
