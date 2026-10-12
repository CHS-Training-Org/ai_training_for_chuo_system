package com.example.bookflow.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockAdmin;
import com.example.bookflow.support.WithMockApprover;
import com.example.bookflow.support.WithMockMember;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDateTime;
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

  /** MEMBER の DRAFT 予約（reservation-draft ユニット検証用・2025-06-13 09:00-10:00） */
  private static final UUID RESERVATION_DRAFT_ID =
      UUID.fromString("30000000-0000-0000-0000-00000000002a");

  // ---- resourceName・period フィルタ専用 seed（Issue #24 の検証用） ----

  /** resourceName フィルタ検証用リソース（"FilterAlpha" を含む） */
  private static final UUID RESOURCE_FILTER_A_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000012");

  /** resourceName フィルタの非一致確認用リソース（"FilterAlpha" を含まない） */
  private static final UUID RESOURCE_FILTER_B_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000013");

  /** "%" エスケープ検証用リソース（"90%" を含む） */
  private static final UUID RESOURCE_FILTER_PERCENT_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000014");

  /** "%" エスケープのデコイ用リソース（"90" は含むが "90%" は含まない） */
  private static final UUID RESOURCE_FILTER_PERCENT_DECOY_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000015");

  /** MEMBER が所有する、RESOURCE_FILTER_A_ID への APPROVED 予約（2025-08-01 10:00-12:00） */
  private static final UUID RESERVATION_FILTER_MEMBER_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000023");

  /** OTHER_MEMBER が所有する、RESOURCE_FILTER_A_ID への APPROVED 予約（同一期間・ロール可視範囲確認用） */
  private static final UUID RESERVATION_FILTER_OTHER_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000024");

  /** MEMBER が所有する、RESOURCE_FILTER_A_ID への APPROVED 予約（期間フィルタ範囲外・2025-09-15） */
  private static final UUID RESERVATION_FILTER_OUTSIDE_PERIOD_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000025");

  /** MEMBER が所有する、RESOURCE_FILTER_PERCENT_ID への APPROVED 予約（"%" エスケープ検証用） */
  private static final UUID RESERVATION_FILTER_PERCENT_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000026");

  /** MEMBER が所有する、RESOURCE_FILTER_PERCENT_DECOY_ID への APPROVED 予約（"%" エスケープのデコイ） */
  private static final UUID RESERVATION_FILTER_PERCENT_DECOY_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000027");

  /** MEMBER が所有する、RESOURCE_FILTER_A_ID への PENDING 予約（resourceName+status の AND 確認用） */
  private static final UUID RESERVATION_FILTER_PENDING_SAMENAME_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000028");

  /**
   * MEMBER が所有する、RESOURCE_FILTER_B_ID（"FilterAlpha" を含まない）への APPROVED 予約 （2025-08-01
   * 14:00-15:00・period/status は一致するが resourceName のみ不一致、 resourceName 条件自体が複合クエリで効いているかの確認用デコイ）
   */
  private static final UUID RESERVATION_FILTER_OTHER_RESOURCE_ID =
      UUID.fromString("30000000-0000-0000-0000-000000000029");

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

    // resourceName・period フィルタ専用 seed
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_FILTER_A_ID,
        "FilterAlpha会議室",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_FILTER_B_ID,
        "備品ベータ",
        "EQUIPMENT",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_FILTER_PERCENT_ID,
        "在庫90%引き備品",
        "EQUIPMENT",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_FILTER_PERCENT_DECOY_ID,
        "備品90番",
        "EQUIPMENT",
        false,
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

    // MEMBER の DRAFT 予約（2025-06-13 09:00-10:00、要承認リソース）
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_DRAFT_ID,
        RESOURCE_WITH_APPROVAL_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 6, 13, 9, 0),
        LocalDateTime.of(2025, 6, 13, 10, 0),
        "MEMBER の下書き予約",
        "DRAFT",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));

    // resourceName・period フィルタ専用 seed（いずれも APPROVED、既存の PENDING 件数系テストに影響しない）
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_FILTER_MEMBER_ID,
        RESOURCE_FILTER_A_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 8, 1, 10, 0),
        LocalDateTime.of(2025, 8, 1, 12, 0),
        "フィルタ検証用予約（MEMBER）",
        "APPROVED",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_FILTER_OTHER_ID,
        RESOURCE_FILTER_A_ID,
        OTHER_MEMBER_ID,
        LocalDateTime.of(2025, 8, 1, 10, 0),
        LocalDateTime.of(2025, 8, 1, 12, 0),
        "フィルタ検証用予約（OTHER_MEMBER）",
        "APPROVED",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_FILTER_OUTSIDE_PERIOD_ID,
        RESOURCE_FILTER_A_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 9, 15, 10, 0),
        LocalDateTime.of(2025, 9, 15, 12, 0),
        "期間フィルタ範囲外の予約",
        "APPROVED",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_FILTER_PERCENT_ID,
        RESOURCE_FILTER_PERCENT_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 8, 5, 10, 0),
        LocalDateTime.of(2025, 8, 5, 12, 0),
        "%エスケープ検証用予約",
        "APPROVED",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_FILTER_PERCENT_DECOY_ID,
        RESOURCE_FILTER_PERCENT_DECOY_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 8, 5, 10, 0),
        LocalDateTime.of(2025, 8, 5, 12, 0),
        "%エスケープのデコイ予約",
        "APPROVED",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_FILTER_PENDING_SAMENAME_ID,
        RESOURCE_FILTER_A_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 8, 2, 10, 0),
        LocalDateTime.of(2025, 8, 2, 12, 0),
        "resourceName+statusのAND確認用予約",
        "PENDING",
        LocalDateTime.of(2025, 6, 1, 9, 0),
        LocalDateTime.of(2025, 6, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_FILTER_OTHER_RESOURCE_ID,
        RESOURCE_FILTER_B_ID,
        MEMBER_ID,
        LocalDateTime.of(2025, 8, 1, 14, 0),
        LocalDateTime.of(2025, 8, 1, 15, 0),
        "resourceName条件自体の効果確認用デコイ予約",
        "APPROVED",
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
        "DELETE FROM reservations WHERE id IN (?, ?, ?, ?)",
        RESERVATION_MEMBER_ID,
        RESERVATION_OTHER_ID,
        RESERVATION_PENDING_ID,
        RESERVATION_FILTER_OTHER_ID);
    // POST テストで追加された動的予約も削除（resourceName・period フィルタ専用 seed の MEMBER 分も含む）
    jdbcTemplate.update("DELETE FROM reservations WHERE requester_id = ?", MEMBER_ID);
    jdbcTemplate.update(
        "DELETE FROM resources WHERE id IN (?, ?, ?, ?, ?, ?)",
        RESOURCE_NO_APPROVAL_ID,
        RESOURCE_WITH_APPROVAL_ID,
        RESOURCE_FILTER_A_ID,
        RESOURCE_FILTER_B_ID,
        RESOURCE_FILTER_PERCENT_ID,
        RESOURCE_FILTER_PERCENT_DECOY_ID);
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
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].status").value("APPROVED"))
        .andExpect(jsonPath("$[0].resourceId").value(RESOURCE_NO_APPROVAL_ID.toString()))
        .andExpect(jsonPath("$[0].id").isNotEmpty())
        // 繰り返さない予約は系列を持たず、種別は NONE（レスポンスは 17 項目）
        .andExpect(jsonPath("$[0].seriesId").isEmpty())
        .andExpect(jsonPath("$[0].recurrenceType").value("NONE"))
        .andExpect(jsonPath("$[0].recurrenceUntil").isEmpty())
        .andExpect(jsonPath("$[0].length()").value(17));

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
        .andExpect(jsonPath("$[0].status").value("PENDING"));

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
  void create_draftTrue_returns201DraftWithoutApprovalStep() throws Exception {
    String body =
        """
        {
          "resourceId": "%s",
          "startAt": "2025-07-03T10:00:00",
          "endAt": "2025-07-03T12:00:00",
          "purpose": "下書き保存のテスト",
          "draft": true
        }
        """
            .formatted(RESOURCE_WITH_APPROVAL_ID);

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$[0].status").value("DRAFT"));

    // requires_approval=true のリソースでも draft=true のため approval_steps は生成されない
    Integer stepCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM approval_steps WHERE reservation_id IN"
                + " (SELECT id FROM reservations WHERE requester_id = ? AND start_at = ?)",
            Integer.class,
            MEMBER_ID,
            LocalDateTime.of(2025, 7, 3, 10, 0));
    org.assertj.core.api.Assertions.assertThat(stepCount).isZero();

    jdbcTemplate.update(
        "DELETE FROM reservations WHERE requester_id = ? AND start_at = ?",
        MEMBER_ID,
        LocalDateTime.of(2025, 7, 3, 10, 0));
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
  // POST /api/reservations — 繰り返し予約（recurring-reservation ユニット）
  // ---------------------------------------------------------------------------

  /** 繰り返しテストが作る予約（2026 年以降）の件数。seed の予約（2025 年）は数えない。 */
  private int countRecurringTestReservations() {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM reservations WHERE requester_id = ? AND start_at >= ?",
            Integer.class,
            MEMBER_ID,
            LocalDateTime.of(2026, 1, 1, 0, 0));
    return count == null ? 0 : count;
  }

  /** 予約申請の JSON。{@code extraFields} は {@code ,"recurrenceType":"WEEKLY"} のように先頭にカンマを付けて渡す。 */
  private static String reservationBody(
      UUID resourceId, String startAt, String endAt, String extraFields) {
    return """
        {
          "resourceId": "%s",
          "startAt": "%s",
          "endAt": "%s",
          "purpose": "定例会議"%s
        }
        """
        .formatted(resourceId, startAt, endAt, extraFields);
  }

  private static String weeklyFields(String until) {
    return ",\"recurrenceType\": \"WEEKLY\", \"recurrenceUntil\": \"" + until + "\"";
  }

  private MvcResult postReservation(String body) throws Exception {
    return mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andReturn();
  }

  @Test
  @WithMockMember
  void create_weekly_returns201ArrayInAscendingOrderWithSharedSeries() throws Exception {
    // 2026-11-02（月）から 11/23（月）まで毎週: 11/02, 11/09, 11/16, 11/23 の 4 件（終了日当日を含む）
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-23"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.length()").value(4))
        .andExpect(jsonPath("$[0].startAt").value("2026-11-02T10:00:00"))
        .andExpect(jsonPath("$[1].startAt").value("2026-11-09T10:00:00"))
        .andExpect(jsonPath("$[2].startAt").value("2026-11-16T10:00:00"))
        .andExpect(jsonPath("$[3].startAt").value("2026-11-23T10:00:00"))
        .andExpect(jsonPath("$[3].endAt").value("2026-11-23T11:00:00"))
        .andExpect(jsonPath("$[0].status").value("APPROVED"))
        .andExpect(jsonPath("$[0].recurrenceType").value("WEEKLY"))
        .andExpect(jsonPath("$[0].recurrenceUntil").value("2026-11-23"))
        .andExpect(jsonPath("$[0].seriesId").isNotEmpty())
        // 申請のレスポンスではシリーズ件数・残り回数を数えない
        .andExpect(jsonPath("$[0].seriesCount").isEmpty())
        .andExpect(jsonPath("$[0].remainingCount").isEmpty());

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isEqualTo(4);
    Integer distinctSeries =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(DISTINCT series_id) FROM reservations"
                + " WHERE requester_id = ? AND start_at >= ?",
            Integer.class,
            MEMBER_ID,
            LocalDateTime.of(2026, 1, 1, 0, 0));
    org.assertj.core.api.Assertions.assertThat(distinctSeries).isEqualTo(1);
  }

  @Test
  @WithMockMember
  void create_monthlyDay31_skipsMonthsWithoutThatDay() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-01-31T10:00:00",
            "2026-01-31T11:00:00",
            ",\"recurrenceType\": \"MONTHLY\", \"recurrenceUntil\": \"2026-05-31\"");

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].startAt").value("2026-01-31T10:00:00"))
        .andExpect(jsonPath("$[1].startAt").value("2026-03-31T10:00:00"))
        .andExpect(jsonPath("$[2].startAt").value("2026-05-31T10:00:00"));
  }

  @Test
  @WithMockMember
  void create_untilSameDayAsStart_createsOneReservationWithSeries() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-02"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].recurrenceType").value("WEEKLY"))
        .andExpect(jsonPath("$[0].seriesId").isNotEmpty());
  }

  @Test
  @WithMockMember
  void create_overnightWeekly_keepsSameLengthForEachOccurrence() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T23:00:00",
            "2026-11-03T02:00:00",
            weeklyFields("2026-11-09"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[1].startAt").value("2026-11-09T23:00:00"))
        .andExpect(jsonPath("$[1].endAt").value("2026-11-10T02:00:00"));
  }

  @Test
  @WithMockMember
  void create_oneOccurrenceConflictsWithExisting_returns409AndCreatesNothing() throws Exception {
    // 3 回目（11/16 10:00-11:00）だけが既存の APPROVED 予約（10:30-11:30）と重なる
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        UUID.fromString("40000000-0000-0000-0000-000000000001"),
        RESOURCE_NO_APPROVAL_ID,
        MEMBER_ID,
        LocalDateTime.of(2026, 11, 16, 10, 30),
        LocalDateTime.of(2026, 11, 16, 11, 30),
        "既存の予約",
        "APPROVED",
        LocalDateTime.of(2026, 6, 1, 9, 0),
        LocalDateTime.of(2026, 6, 1, 9, 0));
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-23"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"))
        // メッセージは既存の固定文言のままで、衝突した日付（11/16 など）を含まない
        .andExpect(jsonPath("$.message").value("同一リソースの同一時間帯に承認済みまたは承認待ちの予約が存在します。"));

    // 全件ロールバック: 既存の 1 件（seed）だけが残り、11/02・11/09・11/23 の回も作られていない
    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isEqualTo(1);
  }

  @Test
  @WithMockMember
  void create_occurrencesOverlapEachOther_returns409AndCreatesNothing() throws Exception {
    // 8 日間の予約の毎週の繰り返し。1 回目と 2 回目が互いに重なる（既存の予約との重複はない）
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-10T10:00:00",
            weeklyFields("2026-11-09"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isZero();
  }

  @Test
  @WithMockMember
  void create_draftOccurrencesOverlapEachOther_returns409() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-10T10:00:00",
            weeklyFields("2026-11-09") + ",\"draft\": true");

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isZero();
  }

  @Test
  @WithMockMember
  void create_noneWithRecurrenceUntil_returns400() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            ",\"recurrenceType\": \"NONE\", \"recurrenceUntil\": \"2026-11-30\"");

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isZero();
  }

  @Test
  @WithMockMember
  void create_weeklyWithoutRecurrenceUntil_returns400() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            ",\"recurrenceType\": \"WEEKLY\"");

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isZero();
  }

  @Test
  @WithMockMember
  void create_monthlyWithoutRecurrenceUntil_returns400() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            ",\"recurrenceType\": \"MONTHLY\"");

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockMember
  void create_recurrenceUntilBeforeStartDate_returns400() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-01"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isZero();
  }

  @Test
  @WithMockMember
  void create_unknownRecurrenceType_returns400() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            ",\"recurrenceType\": \"DAILY\", \"recurrenceUntil\": \"2026-11-30\"");

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockMember
  void create_weeklyDraft_createsAllAsDraftWithoutApprovalSteps() throws Exception {
    String body =
        reservationBody(
            RESOURCE_WITH_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16") + ",\"draft\": true");

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].status").value("DRAFT"))
        .andExpect(jsonPath("$[1].status").value("DRAFT"))
        .andExpect(jsonPath("$[2].status").value("DRAFT"))
        .andExpect(jsonPath("$[0].seriesId").isNotEmpty());

    Integer stepCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM approval_steps WHERE reservation_id IN"
                + " (SELECT id FROM reservations WHERE requester_id = ? AND start_at >= ?)",
            Integer.class,
            MEMBER_ID,
            LocalDateTime.of(2026, 1, 1, 0, 0));
    org.assertj.core.api.Assertions.assertThat(stepCount).isZero();
  }

  @Test
  @WithMockMember
  void create_weeklyApprovalRequired_createsPendingWithOneStepPerReservation() throws Exception {
    String body =
        reservationBody(
            RESOURCE_WITH_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.length()").value(3))
        .andExpect(jsonPath("$[0].status").value("PENDING"))
        .andExpect(jsonPath("$[2].status").value("PENDING"));

    Integer stepCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM approval_steps WHERE reservation_id IN"
                + " (SELECT id FROM reservations WHERE requester_id = ? AND start_at >= ?)",
            Integer.class,
            MEMBER_ID,
            LocalDateTime.of(2026, 1, 1, 0, 0));
    org.assertj.core.api.Assertions.assertThat(stepCount).isEqualTo(3);
  }

  @Test
  @WithMockMember
  void create_weekly_cancelOneOccurrenceLeavesOthersUntouched() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16"));
    String json = postReservation(body).getResponse().getContentAsString();
    List<String> ids = JsonPath.read(json, "$[*].id");

    mockMvc
        .perform(post("/api/reservations/" + ids.get(1) + "/cancel"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CANCELLED"));

    List<String> statuses =
        jdbcTemplate.queryForList(
            "SELECT status FROM reservations WHERE requester_id = ? AND start_at >= ?"
                + " ORDER BY start_at",
            String.class,
            MEMBER_ID,
            LocalDateTime.of(2026, 1, 1, 0, 0));
    org.assertj.core.api.Assertions.assertThat(statuses)
        .containsExactly("APPROVED", "CANCELLED", "APPROVED");
  }

  @Test
  @WithMockMember
  void create_weeklyDraft_submitOneOccurrenceLeavesOthersDraftAndKeepsSeriesId() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16") + ",\"draft\": true");
    String json = postReservation(body).getResponse().getContentAsString();
    List<String> ids = JsonPath.read(json, "$[*].id");
    String seriesId = JsonPath.read(json, "$[0].seriesId");

    String putBody =
        """
        {
          "startAt": "2026-11-09T10:00:00",
          "endAt": "2026-11-09T11:00:00",
          "purpose": "正式申請する回",
          "submit": true
        }
        """;
    mockMvc
        .perform(
            put("/api/reservations/" + ids.get(1))
                .contentType(MediaType.APPLICATION_JSON)
                .content(putBody))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APPROVED"))
        .andExpect(jsonPath("$.seriesId").value(seriesId));

    List<String> statuses =
        jdbcTemplate.queryForList(
            "SELECT status FROM reservations WHERE requester_id = ? AND start_at >= ?"
                + " ORDER BY start_at",
            String.class,
            MEMBER_ID,
            LocalDateTime.of(2026, 1, 1, 0, 0));
    org.assertj.core.api.Assertions.assertThat(statuses)
        .containsExactly("DRAFT", "APPROVED", "DRAFT");
  }

  /** 繰り返しテスト用: MEMBER の予約を 1 件、指定のステータス・系列で挿入する。 */
  private void insertMemberReservation(
      UUID id,
      UUID resourceId,
      LocalDateTime startAt,
      LocalDateTime endAt,
      String status,
      UUID seriesId) {
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status,"
            + " created_at, updated_at, recurrence_type, recurrence_until, series_id)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        resourceId,
        MEMBER_ID,
        startAt,
        endAt,
        "テスト用の予約",
        status,
        LocalDateTime.of(2026, 6, 1, 9, 0),
        LocalDateTime.of(2026, 6, 1, 9, 0),
        seriesId == null ? "NONE" : "WEEKLY",
        seriesId == null ? null : java.sql.Date.valueOf("2026-11-16"),
        seriesId);
  }

  @Test
  @WithMockMember
  void create_existingPendingReservationConflictsWithOneOccurrence_returns409() throws Exception {
    insertMemberReservation(
        UUID.fromString("40000000-0000-0000-0000-000000000002"),
        RESOURCE_NO_APPROVAL_ID,
        LocalDateTime.of(2026, 11, 9, 10, 0),
        LocalDateTime.of(2026, 11, 9, 11, 0),
        "PENDING",
        null);
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("RESERVATION_CONFLICT"));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isEqualTo(1);
  }

  @Test
  @WithMockMember
  void create_existingDraftReservationDoesNotConflict_createsAllOccurrences() throws Exception {
    // DRAFT は重複判定の対象外（PENDING / APPROVED のみ）
    insertMemberReservation(
        UUID.fromString("40000000-0000-0000-0000-000000000003"),
        RESOURCE_NO_APPROVAL_ID,
        LocalDateTime.of(2026, 11, 9, 10, 0),
        LocalDateTime.of(2026, 11, 9, 11, 0),
        "DRAFT",
        null);
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.length()").value(3));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isEqualTo(4);
  }

  @Test
  @WithMockMember
  void create_weeklyApproverNotAvailable_returns422AndRollsBackSavedReservations()
      throws Exception {
    // APPROVER がいない状態で、承認が必要なリソースに繰り返しを申請する。
    // 予約は先に保存され、承認ステップの作成で例外になるため、DB 上のロールバックを確認できる
    jdbcTemplate.update("DELETE FROM users WHERE id = ?", APPROVER_ID);
    String body =
        reservationBody(
            RESOURCE_WITH_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16"));

    mockMvc
        .perform(post("/api/reservations").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("APPROVER_NOT_AVAILABLE"));

    org.assertj.core.api.Assertions.assertThat(countRecurringTestReservations()).isZero();
  }

  @Test
  @WithMockApprover
  void approveAndReject_seriesOccurrences_decideEachOneIndependently() throws Exception {
    // 承認が必要なリソースの繰り返し予約（3 回分、すべて PENDING）と、予約ごとの承認ステップを seed する
    UUID seriesId = UUID.fromString("40000000-0000-0000-0000-000000000090");
    UUID[] reservationIds = {
      UUID.fromString("40000000-0000-0000-0000-000000000011"),
      UUID.fromString("40000000-0000-0000-0000-000000000012"),
      UUID.fromString("40000000-0000-0000-0000-000000000013")
    };
    UUID[] stepIds = {
      UUID.fromString("40000000-0000-0000-0000-0000000000a1"),
      UUID.fromString("40000000-0000-0000-0000-0000000000a2"),
      UUID.fromString("40000000-0000-0000-0000-0000000000a3")
    };
    for (int i = 0; i < 3; i++) {
      LocalDateTime startAt = LocalDateTime.of(2026, 11, 2, 10, 0).plusWeeks(i);
      insertMemberReservation(
          reservationIds[i],
          RESOURCE_WITH_APPROVAL_ID,
          startAt,
          startAt.plusHours(1),
          "PENDING",
          seriesId);
      jdbcTemplate.update(
          "INSERT INTO approval_steps"
              + " (id, reservation_id, approver_id, step_order, status, created_at)"
              + " VALUES (?, ?, ?, ?, ?, ?)",
          stepIds[i],
          reservationIds[i],
          APPROVER_ID,
          1,
          "PENDING",
          LocalDateTime.of(2026, 6, 1, 9, 0));
    }

    // 1 回目を承認し、2 回目を却下する（3 回目は触らない）
    mockMvc.perform(post("/api/approvals/" + stepIds[0] + "/approve")).andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/approvals/" + stepIds[1] + "/reject")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\": \"この回は別の会議があるため\"}"))
        .andExpect(status().isOk());

    List<String> statuses =
        jdbcTemplate.queryForList(
            "SELECT status FROM reservations WHERE series_id = ? ORDER BY start_at",
            String.class,
            seriesId);
    org.assertj.core.api.Assertions.assertThat(statuses)
        .containsExactly("APPROVED", "REJECTED", "PENDING");
    // 承認・却下は系列の情報に触れない
    Integer sameSeries =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM reservations WHERE series_id = ?", Integer.class, seriesId);
    org.assertj.core.api.Assertions.assertThat(sameSeries).isEqualTo(3);
  }

  // ---------------------------------------------------------------------------
  // OpenAPI への反映（レスポンスの配列化と繰り返し予約の項目）
  // ---------------------------------------------------------------------------

  @Test
  void apiDocs_reflectsRecurrenceFieldsAndArrayResponse() throws Exception {
    String docs =
        mockMvc
            .perform(get("/v3/api-docs").accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    // リクエストの 2 項目と、レスポンスの 5 項目がスキーマに載る
    org.assertj.core.api.Assertions.assertThat(docs)
        .contains("recurrenceType", "recurrenceUntil", "seriesId", "seriesCount", "remainingCount");
    // POST /api/reservations の 201 レスポンスは、ReservationResponse の配列
    Object postCreatedSchemaType =
        JsonPath.read(
            docs, "$.paths['/api/reservations'].post.responses['201'].content['*/*'].schema.type");
    org.assertj.core.api.Assertions.assertThat(postCreatedSchemaType).isEqualTo("array");
  }

  // ---------------------------------------------------------------------------
  // GET /api/reservations/{id} — 繰り返し予約のシリーズ情報
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void get_seriesReservation_returnsSeriesCountAndRemainingCountIncludingCancelled()
      throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-23"));
    String json = postReservation(body).getResponse().getContentAsString();
    List<String> ids = JsonPath.read(json, "$[*].id");
    // 3 回目をキャンセルしても、件数は全ステータスを数える
    mockMvc.perform(post("/api/reservations/" + ids.get(2) + "/cancel")).andExpect(status().isOk());

    // 2 回目（11/09）: シリーズ 4 件、この予約より後は 11/16 と 11/23 の 2 件
    mockMvc
        .perform(get("/api/reservations/" + ids.get(1)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recurrenceType").value("WEEKLY"))
        .andExpect(jsonPath("$.recurrenceUntil").value("2026-11-23"))
        .andExpect(jsonPath("$.seriesId").isNotEmpty())
        .andExpect(jsonPath("$.seriesCount").value(4))
        .andExpect(jsonPath("$.remainingCount").value(2));

    // 最後の回: 残り回数は 0
    mockMvc
        .perform(get("/api/reservations/" + ids.get(3)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.seriesCount").value(4))
        .andExpect(jsonPath("$.remainingCount").value(0));
  }

  @Test
  @WithMockMember
  void get_noneReservation_returnsNullSeriesCounts() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + RESERVATION_MEMBER_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recurrenceType").value("NONE"))
        .andExpect(jsonPath("$.seriesId").isEmpty())
        .andExpect(jsonPath("$.seriesCount").isEmpty())
        .andExpect(jsonPath("$.remainingCount").isEmpty());
  }

  @Test
  @WithMockMember
  void list_seriesReservations_doesNotReturnSeriesCounts() throws Exception {
    String body =
        reservationBody(
            RESOURCE_NO_APPROVAL_ID,
            "2026-11-02T10:00:00",
            "2026-11-02T11:00:00",
            weeklyFields("2026-11-16"));
    postReservation(body);

    mockMvc
        .perform(get("/api/reservations").param("size", "100"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.seriesId != null)]").isNotEmpty())
        .andExpect(jsonPath("$.content[?(@.seriesCount != null)]").isEmpty())
        .andExpect(jsonPath("$.content[?(@.remainingCount != null)]").isEmpty());
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
  // GET /api/reservations?resourceName=...&from=...&to=... — resourceName・period フィルタ（Issue #24）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void list_resourceNameCaseInsensitive_matchesRegardlessOfCase() throws Exception {
    // BR-01: resourceName は大文字小文字を区別しない部分一致
    mockMvc
        .perform(get("/api/reservations").param("resourceName", "filteralpha"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_MEMBER_ID)).doesNotExist());
  }

  @Test
  @WithMockMember
  void list_resourceNameWithPercentCharacter_matchesLiteralPercentNotWildcard() throws Exception {
    // BR-03: "%" はワイルドカードではなくリテラルとして扱う。
    // RESERVATION_FILTER_PERCENT_DECOY_ID は "90" は含むが "90%" は含まないため除外されるべき
    mockMvc
        .perform(get("/api/reservations").param("resourceName", "90%"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PERCENT_ID))
                .exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PERCENT_DECOY_ID))
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_blankResourceName_returnsAllVisibleReservationsWithoutResourceNameFilter()
      throws Exception {
    // BR-02/BR-07: 空白のみの resourceName は未入力として扱う
    mockMvc
        .perform(get("/api/reservations").param("resourceName", "   "))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_MEMBER_ID)).exists());
  }

  @Test
  @WithMockMember
  void list_periodOverlap_includesReservationWithinRangeAndExcludesOutsideRange() throws Exception {
    // BR-04: 期間重複判定。8月の範囲指定で8月の予約は含まれ、9月の予約（同一resourceName）は除外される
    mockMvc
        .perform(
            get("/api/reservations")
                .param("from", "2025-08-01T00:00:00")
                .param("to", "2025-08-01T23:59:59"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OUTSIDE_PERIOD_ID))
                .doesNotExist())
        .andExpect(
            // 同一期間・同一リソースだが他メンバーの予約。期間のみフィルタでも
            // requester_id の絞り込み（本人分のみ）が効いていることの確認用
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID))
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_periodAdjacentToReservation_excludesNonOverlappingBoundary() throws Exception {
    // BR-04: 境界が一致するだけの隣接期間は重複としない（checkConflict/overlapsと同じ半開区間の意味論）
    mockMvc
        .perform(
            get("/api/reservations")
                .param("from", "2025-08-01T12:00:00")
                .param("to", "2025-08-01T13:00:00"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID))
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_fromOnlyWithoutTo_returns400ValidationError() throws Exception {
    // BR-05: from・to は同時指定必須
    mockMvc
        .perform(get("/api/reservations").param("from", "2025-08-01T00:00:00"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockMember
  void list_toOnlyWithoutFrom_returns400ValidationError() throws Exception {
    mockMvc
        .perform(get("/api/reservations").param("to", "2025-08-01T23:59:59"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockMember
  void list_memberWithResourceNameFilter_doesNotSeeOtherMembersMatchingReservation()
      throws Exception {
    // BR-06: resourceName が一致してもロール別可視範囲（本人分のみ）は維持される
    mockMvc
        .perform(get("/api/reservations").param("resourceName", "FilterAlpha"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID))
                .doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_adminWithResourceNameFilter_seesAllMatchingReservations() throws Exception {
    // BR-06: ADMIN は resourceName フィルタと組み合わせても全予約が対象
    mockMvc
        .perform(get("/api/reservations").param("resourceName", "FilterAlpha"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID)).exists());
  }

  @Test
  @WithMockMember
  void list_resourceNameWithStatusFilter_appliesAndCondition() throws Exception {
    // resourceName・status は AND 合成される。RESERVATION_FILTER_PENDING_SAMENAME_ID は
    // 同じ resourceName に一致するが status が PENDING のため、APPROVED 指定時は除外される
    mockMvc
        .perform(
            get("/api/reservations")
                .param("resourceName", "FilterAlpha")
                .param("status", "APPROVED"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PENDING_SAMENAME_ID))
                .doesNotExist())
        .andExpect(
            // resourceName に一致しないが同じ APPROVED 状態のデコイ（resourceName 条件自体の検証用）
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_RESOURCE_ID))
                .doesNotExist())
        .andExpect(
            // resourceName・status はともに一致するが他メンバーの予約（requester_id 条件自体の検証用）
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID))
                .doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_adminWithResourceNameAndPeriod_appliesAndCondition() throws Exception {
    // ReservationService#list の ADMIN・resourceName・period 分岐（status 未指定）を検証する
    mockMvc
        .perform(
            get("/api/reservations")
                .param("resourceName", "FilterAlpha")
                .param("from", "2025-08-01T00:00:00")
                .param("to", "2025-08-01T23:59:59"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OUTSIDE_PERIOD_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_RESOURCE_ID))
                .doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_adminWithResourceNameAndStatus_appliesAndCondition() throws Exception {
    // ReservationService#list の ADMIN・resourceName・status 分岐（period 未指定）を検証する
    mockMvc
        .perform(
            get("/api/reservations")
                .param("resourceName", "FilterAlpha")
                .param("status", "APPROVED"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PENDING_SAMENAME_ID))
                .doesNotExist())
        .andExpect(
            // resourceName に一致しないが同じ APPROVED 状態のデコイ（resourceName 条件自体の検証用）
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_RESOURCE_ID))
                .doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_adminWithPeriodAndStatus_appliesAndCondition() throws Exception {
    // ReservationService#list の ADMIN・period・status 分岐（resourceName 未指定）を検証する
    mockMvc
        .perform(
            get("/api/reservations")
                .param("from", "2025-08-01T00:00:00")
                .param("to", "2025-08-02T23:59:59")
                .param("status", "APPROVED"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PENDING_SAMENAME_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OUTSIDE_PERIOD_ID))
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_memberWithResourceNameAndPeriod_appliesAndConditionWithinOwnReservations()
      throws Exception {
    // ReservationService#list の 非ADMIN・resourceName・period 分岐（status 未指定）を検証する
    mockMvc
        .perform(
            get("/api/reservations")
                .param("resourceName", "FilterAlpha")
                .param("from", "2025-08-01T00:00:00")
                .param("to", "2025-08-01T23:59:59"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OUTSIDE_PERIOD_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_RESOURCE_ID))
                .doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_adminWithResourceNameAndPeriodAndStatus_appliesFullyCombinedAndCondition()
      throws Exception {
    // 16メソッドのうち最も条件数の多い組み合わせ（ADMIN）を、モックではなく実際の JPQL 実行で検証する
    mockMvc
        .perform(
            get("/api/reservations")
                .param("resourceName", "FilterAlpha")
                .param("from", "2025-08-01T00:00:00")
                .param("to", "2025-08-02T23:59:59")
                .param("status", "APPROVED"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PENDING_SAMENAME_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OUTSIDE_PERIOD_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_RESOURCE_ID))
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_memberWithPeriodAndStatus_appliesAndConditionWithinOwnReservations() throws Exception {
    // ReservationService#list の 非ADMIN・period・status 分岐（resourceName 未指定）を、
    // モックではなく実際の JPQL 実行で検証する
    mockMvc
        .perform(
            get("/api/reservations")
                .param("from", "2025-08-01T00:00:00")
                .param("to", "2025-08-02T23:59:59")
                .param("status", "APPROVED"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PENDING_SAMENAME_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OUTSIDE_PERIOD_ID))
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_memberWithResourceNameAndPeriodAndStatus_appliesFullyCombinedAndCondition()
      throws Exception {
    // 16メソッドのうち最も条件数の多い組み合わせ（非ADMIN）を、モックではなく実際の JPQL 実行で検証する
    mockMvc
        .perform(
            get("/api/reservations")
                .param("resourceName", "FilterAlpha")
                .param("from", "2025-08-01T00:00:00")
                .param("to", "2025-08-02T23:59:59")
                .param("status", "APPROVED"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_MEMBER_ID)).exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_PENDING_SAMENAME_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OUTSIDE_PERIOD_ID))
                .doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '%s')]".formatted(RESERVATION_FILTER_OTHER_RESOURCE_ID))
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

  @Test
  @WithMockMember
  void get_ownDraftReservation_returns200() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + RESERVATION_DRAFT_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"));
  }

  @Test
  @WithMockApprover
  void get_otherMemberDraftReservationByApprover_returns403() throws Exception {
    // DRAFT は他のステータスと異なり、APPROVER であっても本人以外は閲覧不可（RSV-02）
    mockMvc
        .perform(get("/api/reservations/" + RESERVATION_DRAFT_ID))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockAdmin
  void get_otherMemberDraftReservationByAdmin_returns200() throws Exception {
    mockMvc
        .perform(get("/api/reservations/" + RESERVATION_DRAFT_ID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"));
  }

  @Test
  @WithMockApprover
  void get_otherMemberPendingReservationByApprover_returns200() throws Exception {
    // DRAFT 以外のステータスでは、APPROVER は引き続き本人以外も閲覧可能（既存挙動の回帰確認）
    mockMvc.perform(get("/api/reservations/" + RESERVATION_PENDING_ID)).andExpect(status().isOk());
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
  void update_draftSubmitFalse_returns200AndRemainsDraft() throws Exception {
    String body =
        """
        {
          "startAt": "2025-06-13T09:00:00",
          "endAt": "2025-06-13T11:00:00",
          "purpose": "下書きの内容編集"
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + RESERVATION_DRAFT_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("DRAFT"))
        .andExpect(jsonPath("$.purpose").value("下書きの内容編集"));
  }

  @Test
  @WithMockMember
  void update_draftSubmitTrue_returns200PendingWithApprovalStep() throws Exception {
    // RESOURCE_WITH_APPROVAL_ID（requires_approval=true）の下書きを正式申請
    String body =
        """
        {
          "startAt": "2025-06-13T09:00:00",
          "endAt": "2025-06-13T11:00:00",
          "purpose": "正式申請テスト",
          "submit": true
        }
        """;

    mockMvc
        .perform(
            put("/api/reservations/" + RESERVATION_DRAFT_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("PENDING"));

    Integer stepCount =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM approval_steps WHERE reservation_id = ?",
            Integer.class,
            RESERVATION_DRAFT_ID);
    org.assertj.core.api.Assertions.assertThat(stepCount).isEqualTo(1);
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
  void cancel_draftReservationByOwner_returnsCancelled() throws Exception {
    // DRAFT のキャンセルは下書きの削除に相当する（RSV-02）
    mockMvc
        .perform(post("/api/reservations/" + RESERVATION_DRAFT_ID + "/cancel"))
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
