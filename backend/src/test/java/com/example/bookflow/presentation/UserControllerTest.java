package com.example.bookflow.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
 * {@link UserController} 結合テスト（api-spec.md §ユーザー・部署 準拠）。
 *
 * <p>ADMIN のみが {@code GET /api/users} にアクセスでき、ページネーション形式で {@link
 * com.example.bookflow.presentation.dto.UserResponse} が返ることを確認する。
 *
 * <p>{@link UserController#list} は {@code @CurrentUser} を使用しないため、認証トークンの JWT {@code sub} に
 * 一致するユーザーレコードをシードする必要はない。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class UserControllerTest extends BaseControllerTest {

  // ---- テスト用固定 ID（71xxxxxx プレフィックスで他テストと分離）----
  private static final UUID DEPT_ID = UUID.fromString("71000000-0000-0000-0000-000000000001");
  private static final UUID MEMBER_USER_ID =
      UUID.fromString("71000000-0000-0000-0000-000000000002");
  private static final UUID APPROVER_USER_ID =
      UUID.fromString("71000000-0000-0000-0000-000000000003");

  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2025, 4, 1, 9, 0, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  /** 各テスト前に Department → User×2 の順でシードデータを挿入する（FK 制約順）。 */
  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "テスト部署");
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        MEMBER_USER_ID,
        "user-member-71",
        "一般会員",
        "member71@example.com",
        DEPT_ID,
        "MEMBER",
        CREATED_AT);
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        APPROVER_USER_ID,
        "user-approver-71",
        "承認者",
        "approver71@example.com",
        DEPT_ID,
        "APPROVER",
        CREATED_AT);
  }

  /** 各テスト後に FK 制約の逆順（User → Department）で削除する。 */
  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update("DELETE FROM users WHERE id IN (?, ?)", MEMBER_USER_ID, APPROVER_USER_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // GET /api/users
  // ---------------------------------------------------------------------------

  @Test
  @WithMockAdmin
  void list_withAdmin_returns200WithPageOfUsers() throws Exception {
    mockMvc
        .perform(get("/api/users").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        // Spring Data Page 形式で返ること
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.totalElements").value(2))
        .andExpect(jsonPath("$.content[0].departmentName").value("テスト部署"));
  }

  @Test
  @WithMockAdmin
  void list_withAdmin_includesDepartmentName() throws Exception {
    mockMvc
        .perform(get("/api/users").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        // departmentName が JOIN FETCH で取得されること
        .andExpect(
            jsonPath("$.content[?(@.email == 'member71@example.com')].departmentName")
                .value(org.hamcrest.Matchers.hasItem("テスト部署")));
  }

  @Test
  @WithMockMember
  void list_withMember_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get("/api/users").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  @WithMockApprover
  void list_withApprover_returns403Forbidden() throws Exception {
    mockMvc
        .perform(get("/api/users").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("FORBIDDEN"));
  }

  @Test
  void list_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get("/api/users").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }
}
