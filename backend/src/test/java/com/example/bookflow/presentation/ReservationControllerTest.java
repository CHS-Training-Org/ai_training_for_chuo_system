package com.example.bookflow.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
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
}
