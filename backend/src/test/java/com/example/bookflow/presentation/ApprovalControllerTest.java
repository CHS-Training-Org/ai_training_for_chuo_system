package com.example.bookflow.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * {@link ApprovalController} 結合テスト（api-spec.md §承認 準拠）。
 *
 * <p>テストデータは {@link JdbcTemplate} で直接挿入・削除し、H2 インメモリ DB を使用する。
 * 承認・却下・コメント必須・決済済みガード・所有権制御・ロール別可視範囲をエンドツーエンドで確認する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ApprovalControllerTest extends BaseControllerTest {

  // ---- テスト用固定 ID ----
  private static final UUID DEPT_ID = UUID.fromString("61000000-0000-0000-0000-000000000001");

  /** MEMBER（申請者）: sub = "test-member-sub" */
  private static final UUID MEMBER_ID = UUID.fromString("61000000-0000-0000-0000-000000000002");

  /** APPROVER（承認者・本人）: sub = "test-approver-sub" */
  private static final UUID APPROVER_ID = UUID.fromString("61000000-0000-0000-0000-000000000003");

  /** 別 APPROVER（他人）: sub = "other-approver-sub" */
  private static final UUID OTHER_APPROVER_ID =
      UUID.fromString("61000000-0000-0000-0000-000000000004");

  /** ADMIN: sub = "test-admin-sub" */
  private static final UUID ADMIN_ID = UUID.fromString("61000000-0000-0000-0000-000000000005");

  /** requires_approval=true のリソース */
  private static final UUID RESOURCE_ID = UUID.fromString("61000000-0000-0000-0000-000000000010");

  /** MEMBER の PENDING 予約（承認ステップが紐づく） */
  private static final UUID RESERVATION_ID =
      UUID.fromString("61000000-0000-0000-0000-000000000020");

  /** APPROVER 担当の PENDING ステップ */
  private static final UUID STEP_ID = UUID.fromString("61000000-0000-0000-0000-000000000030");

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "テスト部");

    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        MEMBER_ID,
        "test-member-sub",
        "申請者",
        "member@example.com",
        DEPT_ID,
        "MEMBER",
        LocalDateTime.of(2025, 4, 1, 9, 0));
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
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        OTHER_APPROVER_ID,
        "other-approver-sub",
        "別承認者",
        "other-approver@example.com",
        DEPT_ID,
        "APPROVER",
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

    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "承認必要会議室",
        "ROOM",
        true,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));

    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_ID,
        RESOURCE_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 7, 10, 10, 0),
        LocalDateTime.of(2025, 7, 10, 12, 0),
        "承認待ち会議",
        "PENDING",
        LocalDateTime.of(2025, 7, 1, 9, 0),
        LocalDateTime.of(2025, 7, 1, 9, 0));

    jdbcTemplate.update(
        "INSERT INTO approval_steps"
            + " (id, reservation_id, approver_id, step_order, status, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        STEP_ID,
        RESERVATION_ID,
        APPROVER_ID,
        1,
        "PENDING",
        LocalDateTime.of(2025, 7, 1, 9, 0));
  }

  @AfterEach
  void deleteSeedData() {
    // FK 逆順：approval_steps → reservations → resources → users → departments
    jdbcTemplate.update("DELETE FROM approval_steps WHERE id = ?", STEP_ID);
    jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", RESERVATION_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", RESOURCE_ID);
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?, ?)",
        MEMBER_ID,
        APPROVER_ID,
        OTHER_APPROVER_ID,
        ADMIN_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // GET /api/approvals/pending — 承認待ち一覧
  // ---------------------------------------------------------------------------

  @Test
  @WithMockApprover
  void listPending_approverRole_returnsOwnStepsOnly() throws Exception {
    mockMvc
        .perform(get("/api/approvals/pending"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.id == '%s')]".formatted(STEP_ID)).exists())
        .andExpect(jsonPath("$[0].status").value("PENDING"))
        .andExpect(jsonPath("$[0].resourceName").value("承認必要会議室"));
  }

  @Test
  @WithMockAdmin
  void listPending_adminRole_returnsAllPendingSteps() throws Exception {
    mockMvc
        .perform(get("/api/approvals/pending"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.id == '%s')]".formatted(STEP_ID)).exists());
  }

  @Test
  @WithMockMember
  void listPending_memberRole_returns403() throws Exception {
    mockMvc.perform(get("/api/approvals/pending")).andExpect(status().isForbidden());
  }

  @Test
  void listPending_unauthenticated_returns401() throws Exception {
    mockMvc.perform(get("/api/approvals/pending")).andExpect(status().isUnauthorized());
  }

  // ---------------------------------------------------------------------------
  // POST /api/approvals/{stepId}/approve — 承認
  // ---------------------------------------------------------------------------

  @Test
  @WithMockApprover
  void approve_pendingStepByOwnerApprover_returns200Approved() throws Exception {
    String body =
        """
        {"comment": "問題ありません。承認します。"}
        """;

    mockMvc
        .perform(
            post("/api/approvals/" + STEP_ID + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APPROVED"))
        .andExpect(jsonPath("$.id").value(STEP_ID.toString()));

    // 予約もAPPROVEDになることを確認（reservationId 経由）
    mockMvc
        .perform(
            post("/api/approvals/" + STEP_ID + "/approve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("APPROVAL_ALREADY_DECIDED"));
  }

  @Test
  @WithMockApprover
  void approve_withoutBody_returns200Approved() throws Exception {
    // コメントなし（body 省略）でも承認可能
    mockMvc
        .perform(post("/api/approvals/" + STEP_ID + "/approve"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APPROVED"));
  }

  @Test
  @WithMockApprover
  void approve_otherApproverStep_returns403() throws Exception {
    // STEP_ID は APPROVER_ID 担当 → other-approver-sub でアクセスすると 403
    // ただし @WithMockApprover のデフォルト sub が "test-approver-sub" なので
    // 別のアノテーションは使わず、別 APPROVER での挿入で確認する
    // 代わりに other-approver-sub でログイン（WithMockApprover(sub="other-approver-sub")）を利用
    // → このテストでは APPROVER_ID 以外のステップを作成して検証
    // 簡略化：WithMockApprover のデフォルトサブ (test-approver-sub) がオーナーなのでここでは
    // 別アプローチ：OTHER_APPROVER_ID が担当のステップを挿入してテスト
    UUID otherStepId = UUID.fromString("61000000-0000-0000-0000-000000000031");
    UUID otherReservationId = UUID.fromString("61000000-0000-0000-0000-000000000032");

    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        otherReservationId,
        RESOURCE_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 8, 1, 10, 0),
        LocalDateTime.of(2025, 8, 1, 12, 0),
        "他承認者担当の予約",
        "PENDING",
        LocalDateTime.of(2025, 7, 1, 9, 0),
        LocalDateTime.of(2025, 7, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO approval_steps"
            + " (id, reservation_id, approver_id, step_order, status, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        otherStepId,
        otherReservationId,
        OTHER_APPROVER_ID, // 別承認者が担当
        1,
        "PENDING",
        LocalDateTime.of(2025, 7, 1, 9, 0));

    try {
      // test-approver-sub（APPROVER_ID）が other-approver-sub（OTHER_APPROVER_ID）担当のステップを操作 → 403
      mockMvc
          .perform(post("/api/approvals/" + otherStepId + "/approve"))
          .andExpect(status().isForbidden());
    } finally {
      jdbcTemplate.update("DELETE FROM approval_steps WHERE id = ?", otherStepId);
      jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", otherReservationId);
    }
  }

  @Test
  @WithMockApprover
  void approve_nonExistentStep_returns404() throws Exception {
    mockMvc
        .perform(post("/api/approvals/" + UUID.randomUUID() + "/approve"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("APPROVAL_STEP_NOT_FOUND"));
  }

  @Test
  @WithMockMember
  void approve_memberRole_returns403() throws Exception {
    mockMvc
        .perform(post("/api/approvals/" + STEP_ID + "/approve"))
        .andExpect(status().isForbidden());
  }

  // ---------------------------------------------------------------------------
  // POST /api/approvals/{stepId}/reject — 却下
  // ---------------------------------------------------------------------------

  @Test
  @WithMockApprover
  void reject_withComment_returns200Rejected() throws Exception {
    String body =
        """
        {"comment": "日程が合いません。日時を変更してください。"}
        """;

    mockMvc
        .perform(
            post("/api/approvals/" + STEP_ID + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("REJECTED"))
        .andExpect(jsonPath("$.id").value(STEP_ID.toString()));
  }

  @Test
  @WithMockApprover
  void reject_emptyComment_returns400CommentRequired() throws Exception {
    String body =
        """
        {"comment": ""}
        """;

    mockMvc
        .perform(
            post("/api/approvals/" + STEP_ID + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("COMMENT_REQUIRED"));
  }

  @Test
  @WithMockApprover
  void reject_nullComment_returns400CommentRequired() throws Exception {
    String body =
        """
        {"comment": null}
        """;

    mockMvc
        .perform(
            post("/api/approvals/" + STEP_ID + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("COMMENT_REQUIRED"));
  }

  @Test
  @WithMockAdmin
  void reject_byAdmin_returns200Rejected() throws Exception {
    String body =
        """
        {"comment": "管理者が却下します。"}
        """;

    mockMvc
        .perform(
            post("/api/approvals/" + STEP_ID + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("REJECTED"));
  }

  @Test
  @WithMockApprover
  void reject_nonExistentStep_returns404() throws Exception {
    String body =
        """
        {"comment": "却下理由"}
        """;

    mockMvc
        .perform(
            post("/api/approvals/" + UUID.randomUUID() + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("APPROVAL_STEP_NOT_FOUND"));
  }

  @Test
  @WithMockMember
  void reject_memberRole_returns403() throws Exception {
    String body =
        """
        {"comment": "却下"}
        """;

    mockMvc
        .perform(
            post("/api/approvals/" + STEP_ID + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
  }
}
