package com.example.bookflow.presentation;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.bookflow.support.BaseControllerTest;
import com.example.bookflow.support.WithMockMember;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link DepartmentController} 結合テスト（api-spec.md §ユーザー・部署 準拠）。
 *
 * <p>全ロール（認証済み）が {@code GET /api/departments} にアクセス可能なこと、 および {@code parentId} の null/非null
 * が正しく返ることを確認する。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class DepartmentControllerTest extends BaseControllerTest {

  // ---- テスト用固定 ID（70xxxxxx プレフィックスで他テストと分離）----
  private static final UUID ROOT_DEPT_ID = UUID.fromString("70000000-0000-0000-0000-000000000001");
  private static final UUID CHILD_DEPT_ID = UUID.fromString("70000000-0000-0000-0000-000000000002");

  @Autowired private JdbcTemplate jdbcTemplate;

  /** 各テスト前に部署データ（ルート + 子）を挿入する。 */
  @BeforeEach
  void insertSeedData() {
    // ルート部署（parent_id = NULL）
    jdbcTemplate.update("INSERT INTO departments (id, name) VALUES (?, ?)", ROOT_DEPT_ID, "本社");
    // 子部署（parent_id = ROOT_DEPT_ID）
    jdbcTemplate.update(
        "INSERT INTO departments (id, name, parent_id) VALUES (?, ?, ?)",
        CHILD_DEPT_ID,
        "開発部",
        ROOT_DEPT_ID);
  }

  /** 各テスト後に FK 制約の逆順（子 → ルート）で削除する。 */
  @AfterEach
  void deleteSeedData() {
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", CHILD_DEPT_ID);
    jdbcTemplate.update("DELETE FROM departments WHERE id = ?", ROOT_DEPT_ID);
  }

  // ---------------------------------------------------------------------------
  // GET /api/departments
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void list_withAuthenticatedMember_returns200WithDepartmentArray() throws Exception {
    mockMvc
        .perform(get("/api/departments").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        // 配列（ページネーションなし）で返ること
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$.length()").value(2));
  }

  @Test
  @WithMockMember
  void list_rootDepartment_hasNullParentId() throws Exception {
    mockMvc
        .perform(get("/api/departments").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        // ORDER BY name ASC: '本'(U+672C) < '開'(U+958B) なので本社が index 0
        // JSON null の検証は 2 引数 jsonPath(path, matcher) 形式を使用する
        .andExpect(jsonPath("$[0].name").value("本社"))
        .andExpect(jsonPath("$[0].parentId", nullValue()));
  }

  @Test
  @WithMockMember
  void list_childDepartment_hasNonNullParentId() throws Exception {
    mockMvc
        .perform(get("/api/departments").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        // 開発部は index 1（名前昇順で本社の後）
        .andExpect(jsonPath("$[1].name").value("開発部"))
        .andExpect(jsonPath("$[1].parentId").value(ROOT_DEPT_ID.toString()));
  }

  @Test
  void list_withoutAuth_returns401Unauthorized() throws Exception {
    mockMvc
        .perform(get("/api/departments").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }
}
