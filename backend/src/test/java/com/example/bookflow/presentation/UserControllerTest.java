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
 * <p>{@link UserController#list} は {@code @CurrentUser} を使用しないが、{@link
 * com.example.bookflow.infrastructure.security.RegisteredUserInterceptor} が全エンドポイントで
 * JWT {@code sub} を {@code users} テーブルと照合するため、各 {@code @WithMock*} アノテーションの
 * デフォルト sub（"test-admin-sub" / "test-member-sub" / "test-approver-sub"）を持つユーザーも
 * シードする必要がある（api-spec.md §認証方式の「全エンドポイント」保証に対応）。
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
  /** @WithMockAdmin（sub="test-admin-sub"）用の認証ユーザー */
  private static final UUID ADMIN_AUTH_USER_ID =
      UUID.fromString("71000000-0000-0000-0000-000000000004");
  /** @WithMockMember（sub="test-member-sub"）用の認証ユーザー（MEMBER_USER_ID と兼用） */
  private static final UUID MEMBER_AUTH_USER_ID =
      UUID.fromString("71000000-0000-0000-0000-000000000005");
  /** @WithMockApprover（sub="test-approver-sub"）用の認証ユーザー（APPROVER_USER_ID と兼用） */
  private static final UUID APPROVER_AUTH_USER_ID =
      UUID.fromString("71000000-0000-0000-0000-000000000006");

  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2025, 4, 1, 9, 0, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  /**
   * 各テスト前に Department → User×5 の順でシードデータを挿入する（FK 制約順）。
   *
   * <p>一覧確認用ユーザー（MEMBER_USER_ID, APPROVER_USER_ID）と
   * RegisteredUserInterceptor 照合用ユーザー（ADMIN/MEMBER/APPROVER AUTH）を分けて登録する。
   */
  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "テスト部署");
    // 一覧取得の内容確認に使うユーザー
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
    // RegisteredUserInterceptor が照合する認証ユーザー（@WithMock* のデフォルト sub に対応）
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        ADMIN_AUTH_USER_ID,
        "test-admin-sub",
        "テスト管理者",
        "admin-auth71@example.com",
        DEPT_ID,
        "ADMIN",
        CREATED_AT);
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        MEMBER_AUTH_USER_ID,
        "test-member-sub",
        "テスト会員",
        "member-auth71@example.com",
        DEPT_ID,
        "MEMBER",
        CREATED_AT);
    jdbcTemplate.update(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        APPROVER_AUTH_USER_ID,
        "test-approver-sub",
        "テスト承認者",
        "approver-auth71@example.com",
        DEPT_ID,
        "APPROVER",
        CREATED_AT);
  }

  /** 各テスト後に FK 制約の逆順（User → Department）で削除する。 */
  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update(
        "DELETE FROM users WHERE id IN (?, ?, ?, ?, ?)",
        MEMBER_USER_ID,
        APPROVER_USER_ID,
        ADMIN_AUTH_USER_ID,
        MEMBER_AUTH_USER_ID,
        APPROVER_AUTH_USER_ID);
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
        // Spring Data Page 形式で返ること（認証ユーザー 3 名 + 一覧確認用 2 名 = 計 5 名）
        .andExpect(jsonPath("$.content").isArray())
        .andExpect(jsonPath("$.totalElements").value(5))
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
