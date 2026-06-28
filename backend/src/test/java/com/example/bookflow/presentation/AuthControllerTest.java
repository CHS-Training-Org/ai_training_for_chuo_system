package com.example.bookflow.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
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
 * {@link AuthController} 結合テスト（api-spec.md §認証 準拠）。
 *
 * <p>BE セキュリティ基盤（JWT 認証・リゾルバ・例外ハンドラ）が正しく連携することを確認する。 テストデータは {@link JdbcTemplate} で直接挿入・削除し、H2
 * インメモリ DB を使用する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class AuthControllerTest extends BaseControllerTest {

  /** テスト用部署 ID（他テストデータと衝突しないよう固定値を使用）。 */
  private static final UUID DEPT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  /** テスト用ユーザー ID。 */
  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

  /** テスト用ユーザー作成日時。 */
  private static final LocalDateTime CREATED_AT = LocalDateTime.of(2025, 4, 1, 9, 0, 0);

  @Autowired private JdbcTemplate jdbcTemplate;

  /** 各テスト前に Department → User の順でシードデータを挿入する（FK 制約順）。 */
  @BeforeEach
  void insertSeedData() {
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "開発部");
    jdbcTemplate.update(
        "INSERT INTO users"
            + " (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        USER_ID,
        "test-member-sub",
        "テスト会員",
        "test@example.com",
        DEPT_ID,
        "MEMBER",
        CREATED_AT);
  }

  /** 各テスト後に FK 制約の逆順（User → Department）で削除する。 */
  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update("DELETE FROM users WHERE id = ?", USER_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // GET /api/users/me
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void getMe_withValidMember_returns200WithUserResponse() throws Exception {
    mockMvc
        .perform(get("/api/users/me").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(USER_ID.toString()))
        .andExpect(jsonPath("$.name").value("テスト会員"))
        .andExpect(jsonPath("$.email").value("test@example.com"))
        .andExpect(jsonPath("$.role").value("MEMBER"))
        .andExpect(jsonPath("$.departmentId").value(DEPT_ID.toString()))
        .andExpect(jsonPath("$.departmentName").value("開発部"))
        .andExpect(jsonPath("$.createdAt").exists());
  }

  @Test
  void getMe_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get("/api/users/me").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  @Test
  @WithMockMember(sub = "nonexistent-sub")
  void getMe_withUnregisteredUser_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get("/api/users/me").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  // ---------------------------------------------------------------------------
  // POST /api/auth/signout
  // ---------------------------------------------------------------------------

  @Test
  void signout_withoutAuth_returns200() throws Exception {
    mockMvc.perform(post("/api/auth/signout")).andExpect(status().isOk());
  }
}
