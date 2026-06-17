package com.example.bookflow.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
 * {@link ResourceController} 結合テスト（api-spec.md §リソース 準拠）。
 *
 * <p>テストデータは {@link JdbcTemplate} で直接挿入・削除し、H2 インメモリ DB を使用する。 ロール別アクセス制御・リソース
 * CRUD・空き照会のレスポンス形状を確認する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ResourceControllerTest extends BaseControllerTest {

  // ---- テスト用固定 ID ----
  private static final UUID DEPT_ID = UUID.fromString("10000000-0000-0000-0000-000000000001");
  private static final UUID USER_ID = UUID.fromString("10000000-0000-0000-0000-000000000002");
  private static final UUID ADMIN_USER_ID = UUID.fromString("10000000-0000-0000-0000-000000000003");
  private static final UUID ACTIVE_RESOURCE_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000010");
  private static final UUID INACTIVE_RESOURCE_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000011");
  private static final UUID RESERVATION_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000020");

  private static final LocalDateTime RESERVATION_START = LocalDateTime.of(2025, 6, 2, 10, 0);
  private static final LocalDateTime RESERVATION_END = LocalDateTime.of(2025, 6, 2, 12, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  @BeforeEach
  void insertSeedData() {
    // Department
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "テスト部");

    // Users（MEMBER + ADMIN）
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        USER_ID,
        "test-member-sub",
        "テスト会員",
        "member@example.com",
        DEPT_ID,
        "MEMBER",
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        ADMIN_USER_ID,
        "test-admin-sub",
        "管理者",
        "admin@example.com",
        DEPT_ID,
        "ADMIN",
        LocalDateTime.of(2025, 4, 1, 9, 0));

    // Resources（active + inactive）
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        ACTIVE_RESOURCE_ID,
        "第1会議室",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        INACTIVE_RESOURCE_ID,
        "旧備品A",
        "EQUIPMENT",
        false,
        false,
        LocalDateTime.of(2025, 4, 1, 9, 0));

    // Reservation（APPROVED・2025-06-02 10:00〜12:00）
    jdbcTemplate.update(
        "INSERT INTO reservations"
            + " (id, resource_id, requester_id, start_at, end_at, purpose, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        RESERVATION_ID,
        ACTIVE_RESOURCE_ID,
        USER_ID,
        RESERVATION_START,
        RESERVATION_END,
        "テスト用予約",
        "APPROVED",
        LocalDateTime.of(2025, 4, 1, 9, 0),
        LocalDateTime.of(2025, 4, 1, 9, 0));
  }

  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update("DELETE FROM reservations WHERE id = ?", RESERVATION_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", ACTIVE_RESOURCE_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", INACTIVE_RESOURCE_ID);
    jdbcTemplate.update("DELETE FROM users WHERE id = ?", USER_ID);
    jdbcTemplate.update("DELETE FROM users WHERE id = ?", ADMIN_USER_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // GET /api/resources — 一覧
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void list_memberWithoutFilter_returnsActiveResourcesOnly() throws Exception {
    mockMvc
        .perform(get("/api/resources").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + INACTIVE_RESOURCE_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_adminWithoutFilter_returnsAllResourcesIncludingInactive() throws Exception {
    mockMvc
        .perform(get("/api/resources").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + INACTIVE_RESOURCE_ID + "')]").exists());
  }

  @Test
  @WithMockMember
  void list_withTimeRangeOverlappingReservation_excludesOccupiedResource() throws Exception {
    // seed した APPROVED 予約（10:00〜12:00）と重複する範囲で照会
    mockMvc
        .perform(
            get("/api/resources")
                .param("from", "2025-06-02T09:00:00")
                .param("to", "2025-06-02T11:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_withTimeRangeAdjacentToReservation_includesResource() throws Exception {
    // 隣接（to == 予約開始・非重複）
    mockMvc
        .perform(
            get("/api/resources")
                .param("from", "2025-06-02T08:00:00")
                .param("to", "2025-06-02T10:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").exists());
  }

  @Test
  @WithMockMember
  void list_fromOnlyWithoutTo_returns400ValidationError() throws Exception {
    // from だけ指定・to なし → 同時指定必須違反 → 400 VALIDATION_ERROR
    mockMvc
        .perform(
            get("/api/resources")
                .param("from", "2025-06-02T09:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockMember
  void list_toOnlyWithoutFrom_returns400ValidationError() throws Exception {
    // to だけ指定・from なし → 同時指定必須違反 → 400 VALIDATION_ERROR
    mockMvc
        .perform(
            get("/api/resources")
                .param("to", "2025-06-02T12:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  // ---------------------------------------------------------------------------
  // POST /api/resources — 登録
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void create_adminWithValidRequest_returns201WithResourceResponse() throws Exception {
    String body =
        """
        {
          "name": "新会議室",
          "category": "ROOM",
          "capacity": 10,
          "location": "4F",
          "requiresApproval": false,
          "isActive": true,
          "description": "新しい会議室"
        }
        """;

    mockMvc
        .perform(post("/api/resources").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("新会議室"))
        .andExpect(jsonPath("$.category").value("ROOM"))
        .andExpect(jsonPath("$.capacity").value(10))
        .andExpect(jsonPath("$.isActive").value(true))
        .andExpect(jsonPath("$.id").exists());
  }

  @Test
  @WithMockMember
  void create_memberRequest_returns403Forbidden() throws Exception {
    String body =
        """
        {
          "name": "不正リソース",
          "category": "ROOM",
          "requiresApproval": false,
          "isActive": true
        }
        """;

    mockMvc
        .perform(post("/api/resources").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void create_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(
            post("/api/resources")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"x\",\"category\":\"ROOM\",\"requiresApproval\":false,\"isActive\":true}"))
        .andExpect(status().isUnauthorized());
  }

  // ---------------------------------------------------------------------------
  // GET /api/resources/{id} — 詳細
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void get_existingId_returns200WithResourceResponse() throws Exception {
    mockMvc
        .perform(get("/api/resources/" + ACTIVE_RESOURCE_ID).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(ACTIVE_RESOURCE_ID.toString()))
        .andExpect(jsonPath("$.name").value("第1会議室"))
        .andExpect(jsonPath("$.category").value("ROOM"))
        .andExpect(jsonPath("$.isActive").value(true));
  }

  @Test
  @WithMockMember
  void get_nonExistentId_returns404NotFound() throws Exception {
    mockMvc
        .perform(get("/api/resources/" + UUID.randomUUID()).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  // ---------------------------------------------------------------------------
  // PUT /api/resources/{id} — 更新
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void update_adminWithValidRequest_returns200WithUpdatedResource() throws Exception {
    String body =
        """
        {
          "name": "第1会議室（改装後）",
          "category": "ROOM",
          "capacity": 12,
          "location": "3F",
          "requiresApproval": false,
          "isActive": true,
          "description": "改装済み"
        }
        """;

    mockMvc
        .perform(
            put("/api/resources/" + ACTIVE_RESOURCE_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("第1会議室（改装後）"))
        .andExpect(jsonPath("$.capacity").value(12));
  }

  @Test
  @WithMockMember
  void update_memberRequest_returns403Forbidden() throws Exception {
    String body =
        """
        {
          "name": "不正更新",
          "category": "ROOM",
          "requiresApproval": false,
          "isActive": true
        }
        """;

    mockMvc
        .perform(
            put("/api/resources/" + ACTIVE_RESOURCE_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/resources/{id}/status — ステータス切替
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void changeStatus_adminDeactivate_returns200WithIsActiveFalse() throws Exception {
    mockMvc
        .perform(
            patch("/api/resources/" + ACTIVE_RESOURCE_ID + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isActive\": false}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.isActive").value(false));
  }

  @Test
  @WithMockMember
  void changeStatus_memberRequest_returns403Forbidden() throws Exception {
    mockMvc
        .perform(
            patch("/api/resources/" + ACTIVE_RESOURCE_ID + "/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isActive\": false}"))
        .andExpect(status().isForbidden());
  }

  // ---------------------------------------------------------------------------
  // GET /api/resources/{id}/availability — 空き照会
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void availability_occupiedPeriod_returnsOccupiedSlots() throws Exception {
    // seed した予約（10:00〜12:00）を包含する範囲で照会
    mockMvc
        .perform(
            get("/api/resources/" + ACTIVE_RESOURCE_ID + "/availability")
                .param("from", "2025-06-02T00:00:00")
                .param("to", "2025-06-02T23:59:59")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].reservationId").value(RESERVATION_ID.toString()))
        .andExpect(jsonPath("$[0].startAt").exists())
        .andExpect(jsonPath("$[0].endAt").exists());
  }

  @Test
  @WithMockMember
  void availability_noOverlap_returnsEmptyArray() throws Exception {
    // 予約と隣接する範囲（非重複）
    mockMvc
        .perform(
            get("/api/resources/" + ACTIVE_RESOURCE_ID + "/availability")
                .param("from", "2025-06-02T08:00:00")
                .param("to", "2025-06-02T10:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$").isEmpty());
  }

  @Test
  @WithMockMember
  void availability_nonExistentResourceId_returns404() throws Exception {
    mockMvc
        .perform(
            get("/api/resources/" + UUID.randomUUID() + "/availability")
                .param("from", "2025-06-01T00:00:00")
                .param("to", "2025-06-01T23:59:59")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockMember
  void availability_missingFromParam_returns400ValidationError() throws Exception {
    // from パラメータ欠落（必須）→ 400 VALIDATION_ERROR（500 ではない）
    mockMvc
        .perform(
            get("/api/resources/" + ACTIVE_RESOURCE_ID + "/availability")
                .param("to", "2025-06-02T23:59:59")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockMember
  void availability_missingBothParams_returns400ValidationError() throws Exception {
    // from・to 両方欠落 → 400 VALIDATION_ERROR（500 ではない）
    mockMvc
        .perform(
            get("/api/resources/" + ACTIVE_RESOURCE_ID + "/availability")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  // ---------------------------------------------------------------------------
  // RegisteredUserInterceptor — 未登録ユーザーの 401 保証（api-spec.md §認証方式）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember(sub = "unregistered-sub")
  void list_unregisteredUser_returns401() throws Exception {
    // "unregistered-sub" は @BeforeEach で users テーブルに挿入されないため、
    // RegisteredUserInterceptor が UnregisteredUserException をスローして 401 を返す。
    // （修正前は @CurrentUser を持たない GET /api/resources では DB 未登録ユーザーが通過していた）
    mockMvc
        .perform(get("/api/resources").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }
}
