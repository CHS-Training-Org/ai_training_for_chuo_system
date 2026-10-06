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
  // keyword 検索専用の seed（BR-01〜BR-06 の検証用）
  private static final UUID KEYWORD_NAME_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000012");
  private static final UUID KEYWORD_DESC_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000013");
  private static final UUID KEYWORD_PERCENT_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000014");
  private static final UUID KEYWORD_INACTIVE_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000015");
  private static final UUID KEYWORD_PERCENT_DECOY_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000016");
  private static final UUID KEYWORD_UNDERSCORE_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000017");
  private static final UUID KEYWORD_UNDERSCORE_DECOY_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000018");
  private static final UUID KEYWORD_DESC_UNDERSCORE_ID =
      UUID.fromString("10000000-0000-0000-0000-000000000019");
  private static final UUID KEYWORD_DESC_UNDERSCORE_DECOY_ID =
      UUID.fromString("10000000-0000-0000-0000-00000000001a");
  // ソート順選択専用の seed（VEHICLE カテゴリで他 seed と分離。Issue #22）。
  // UUID の字句順・INSERT 順を name 順（Alpha<Bravo<Charlie）・createdAt 順とあえて
  // 食い違わせてある（「sort 未指定時のデフォルト」テストが、ORDER BY 指定なしでも
  // たまたま同じ順序になってしまうことで偽陽性にならないようにするため）。
  private static final UUID SORT_A_ID = UUID.fromString("10000000-0000-0000-0000-00000000001d");
  private static final UUID SORT_B_ID = UUID.fromString("10000000-0000-0000-0000-00000000001b");
  private static final UUID SORT_C_ID = UUID.fromString("10000000-0000-0000-0000-00000000001c");
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
        "INSERT INTO resources"
            + " (id, name, category, requires_approval, is_active, equipment, notes, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ACTIVE_RESOURCE_ID,
        "第1会議室",
        "ROOM",
        false,
        true,
        "プロジェクター1台、ホワイトボード1台",
        "利用後は椅子を元の位置に戻してください",
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

    // keyword 検索専用の seed
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        KEYWORD_NAME_ID,
        "第2会議室（Keyword Room）",
        "ROOM",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources"
            + " (id, name, category, requires_approval, is_active, description, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        KEYWORD_DESC_ID,
        "プロジェクタX",
        "EQUIPMENT",
        false,
        true,
        "予備のKeywordプロジェクタです",
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        KEYWORD_PERCENT_ID,
        "在庫90%引き備品",
        "EQUIPMENT",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        KEYWORD_PERCENT_DECOY_ID,
        "備品90番",
        "EQUIPMENT",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        KEYWORD_UNDERSCORE_ID,
        "型番A_C備品",
        "EQUIPMENT",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        KEYWORD_UNDERSCORE_DECOY_ID,
        "型番ABC備品",
        "EQUIPMENT",
        false,
        true,
        LocalDateTime.of(2025, 4, 1, 9, 0));
    // description 側の "_" エスケープ検証用（name には A_C/ABC いずれも含まない）
    jdbcTemplate.update(
        "INSERT INTO resources"
            + " (id, name, category, requires_approval, is_active, description, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        KEYWORD_DESC_UNDERSCORE_ID,
        "説明文検索専用備品X",
        "EQUIPMENT",
        false,
        true,
        "仕様コードA_Cに対応",
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources"
            + " (id, name, category, requires_approval, is_active, description, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        KEYWORD_DESC_UNDERSCORE_DECOY_ID,
        "説明文検索専用備品Y",
        "EQUIPMENT",
        false,
        true,
        "仕様コードABCに対応",
        LocalDateTime.of(2025, 4, 1, 9, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        KEYWORD_INACTIVE_ID,
        "無効会議室Keyword",
        "ROOM",
        false,
        false,
        LocalDateTime.of(2025, 4, 1, 9, 0));

    // ソート順選択専用の seed（VEHICLE カテゴリで他 seed から分離）。
    // INSERT 順（Charlie → Alpha → Bravo）を name 順・createdAt 順とあえて食い違わせてある。
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, capacity, requires_approval, is_active,"
            + " created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        SORT_C_ID,
        "Charlie Van",
        "VEHICLE",
        5,
        false,
        true,
        LocalDateTime.of(2025, 3, 1, 0, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, capacity, requires_approval, is_active,"
            + " created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        SORT_A_ID,
        "Alpha Van",
        "VEHICLE",
        10,
        false,
        true,
        LocalDateTime.of(2025, 1, 1, 0, 0));
    jdbcTemplate.update(
        "INSERT INTO resources (id, name, category, capacity, requires_approval, is_active,"
            + " created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        SORT_B_ID,
        "Bravo Van",
        "VEHICLE",
        null,
        false,
        true,
        LocalDateTime.of(2025, 2, 1, 0, 0));

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
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_NAME_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_DESC_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_PERCENT_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_PERCENT_DECOY_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_UNDERSCORE_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_UNDERSCORE_DECOY_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_DESC_UNDERSCORE_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_DESC_UNDERSCORE_DECOY_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", KEYWORD_INACTIVE_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", SORT_A_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", SORT_B_ID);
    jdbcTemplate.update("DELETE FROM resources WHERE id = ?", SORT_C_ID);
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
  // GET /api/resources?keyword=... — キーワード検索（BR-01〜BR-07）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void list_keywordCaseInsensitivePartialMatch_matchesNameRegardlessOfCase() throws Exception {
    // BR-01: name への大文字小文字非依存部分一致。KEYWORD_NAME_ID は "Keyword" を含み description は NULL（BR-03）
    mockMvc
        .perform(
            get("/api/resources").param("keyword", "keyword").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_NAME_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordMatchesDescriptionOnly_returnsResourceEvenWhenNameDoesNotMatch()
      throws Exception {
    // BR-01: description 側のみ一致するケース。KEYWORD_NAME_ID は description が NULL だが
    // "予備" を name に含まないため除外される（NULL description がエラーにならないことも同時に確認・BR-03）
    mockMvc
        .perform(get("/api/resources").param("keyword", "予備").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_NAME_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordCaseInsensitiveMatchOnDescriptionOnly_matchesRegardlessOfCase()
      throws Exception {
    // BR-01: description 側も LOWER(description) により大文字小文字を区別しない。
    // KEYWORD_DESC_ID の description は "Keyword"（大文字 K）を含むが、小文字 "keyword" でも一致する。
    // name（"プロジェクタX"）は一致しないため、この一致が description 側の大文字小文字非依存変換に
    // よるものであると特定できる
    mockMvc
        .perform(
            get("/api/resources").param("keyword", "keyword").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_ID + "')]").exists());
  }

  @Test
  @WithMockMember
  void list_keywordWithPercentCharacter_matchesLiteralPercentNotWildcard() throws Exception {
    // BR-04: "%" はワイルドカードではなくリテラルとして扱う。
    // KEYWORD_PERCENT_DECOY_ID は "90" は含むが "90%" は含まないため除外されるべき
    mockMvc
        .perform(get("/api/resources").param("keyword", "90%").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_PERCENT_ID + "')]").exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '" + KEYWORD_PERCENT_DECOY_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordWithUnderscoreCharacter_matchesLiteralUnderscoreNotSingleCharWildcard()
      throws Exception {
    // BR-04: "_" はワイルドカードではなくリテラルとして扱う。
    // KEYWORD_UNDERSCORE_DECOY_ID は "A_C" を含まず "ABC" のみを含むため除外されるべき
    mockMvc
        .perform(get("/api/resources").param("keyword", "A_C").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_UNDERSCORE_ID + "')]").exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '" + KEYWORD_UNDERSCORE_DECOY_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordWithUnderscoreCharacterOnDescription_matchesLiteralUnderscoreNotWildcard()
      throws Exception {
    // BR-04: "_" のリテラル扱いを description 側でも検証する。
    // KEYWORD_DESC_UNDERSCORE_ID/DECOY はいずれも name に "A_C"/"ABC" を含まないため、
    // 一致は description 側のエスケープ処理によるものだと特定できる
    mockMvc
        .perform(get("/api/resources").param("keyword", "A_C").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_UNDERSCORE_ID + "')]").exists())
        .andExpect(
            jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_UNDERSCORE_DECOY_ID + "')]")
                .doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordWithCategory_appliesAndCondition() throws Exception {
    // BR-05: category と keyword は AND 合成される。KEYWORD_PERCENT_ID/DECOY は EQUIPMENT のため
    // category=ROOM では一致しても結果に含まれない
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "90")
                .param("category", "ROOM")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_PERCENT_ID + "')]").doesNotExist())
        .andExpect(
            jsonPath("$.content[?(@.id == '" + KEYWORD_PERCENT_DECOY_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordWithCategory_matchesWithinCategoryAndExcludesNonMatchAndOtherCategory()
      throws Exception {
    // BR-05: findByCategoryAndIsActiveTrueAndKeyword（Page・MEMBER・category あり）。
    // keyword 条件・category 条件のどちらを外しても失敗するよう、同一カテゴリ内の非一致（ACTIVE_RESOURCE_ID）と
    // 他カテゴリの一致（KEYWORD_DESC_ID）の両方を除外対象として確認する
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "Keyword")
                .param("category", "ROOM")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_NAME_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_ID + "')]").doesNotExist())
        // BR-06: KEYWORD_INACTIVE_ID は ROOM・inactive・keyword 一致だが、MEMBER には is_active=true
        // 条件により除外されるべき（category 条件・keyword 条件だけでは除外できない点に注意）
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordMatchingInactiveResource_memberCannotSeeIt() throws Exception {
    // BR-06: keyword が一致してもロール別可視範囲（is_active）は維持される。
    // あわせて KEYWORD_DESC_ID（description の "Keyword" に一致）が含まれることを確認し、
    // このクエリ（findByIsActiveTrueAndKeyword・Page・MEMBER）でも description 側の
    // LOWER() による大文字小文字非依存一致が効いていることを合わせて検証する
    mockMvc
        .perform(
            get("/api/resources").param("keyword", "Keyword").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_ID + "')]").exists());
  }

  @Test
  @WithMockAdmin
  void list_keywordMatchingInactiveResource_adminCanSeeIt() throws Exception {
    // findByKeyword（Page・ADMIN・category なし）。ACTIVE_RESOURCE_ID は "Keyword" を含まないため、
    // keyword の絞り込みが外れていれば（ADMIN は is_active を問わず全件返るため）混入してしまう
    mockMvc
        .perform(
            get("/api/resources").param("keyword", "Keyword").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordWithTimeRangeOverlappingReservation_excludesOccupiedResource() throws Exception {
    // BR-05: keyword は from/to 経路（fetchAllCandidates）にも適用される。
    // findByIsActiveTrueAndKeyword（List・MEMBER・category なし）。
    // ACTIVE_RESOURCE_ID の除外は予約重複（時間帯）が理由であり、keyword 非一致では無い点に注意。
    // keyword 条件自体の絞り込みは、重複する予約が無く "会議室" を含まない KEYWORD_PERCENT_ID の除外で確認する
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "会議室")
                .param("from", "2025-06-02T09:00:00")
                .param("to", "2025-06-02T11:00:00")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_NAME_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_PERCENT_ID + "')]").doesNotExist())
        // BR-06: KEYWORD_INACTIVE_ID（"無効会議室Keyword"）は "会議室" を含み予約重複も無いが、
        // MEMBER には is_active=true 条件により除外されるべき
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_keywordWithCategoryAsAdmin_includesInactiveMatchAndExcludesNonMatchAndOtherCategory()
      throws Exception {
    // findByCategoryAndKeyword（Page・ADMIN・category あり）。
    // KEYWORD_INACTIVE_ID（ROOM・inactive・一致）が ADMIN には見えること、
    // ACTIVE_RESOURCE_ID（ROOM・非一致）・KEYWORD_DESC_ID（EQUIPMENT・一致）が除外されることを確認する
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "Keyword")
                .param("category", "ROOM")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_NAME_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_keywordWithTimeRangeAsAdmin_includesInactiveMatchAndExcludesNonMatch()
      throws Exception {
    // findByKeyword（List・ADMIN・category なし・from/to 経路）。
    // 予約と重複しない期間を使い、除外が keyword 非一致によるものであることを明確にする
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "Keyword")
                .param("from", "2025-07-01T00:00:00")
                .param("to", "2025-07-01T23:59:59")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_PERCENT_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_keywordWithCategoryAndTimeRangeAsMember_appliesCategoryKeywordAndRoleConditions()
      throws Exception {
    // findByCategoryAndIsActiveTrueAndKeyword（List・MEMBER・category あり・from/to 経路）。
    // category（KEYWORD_DESC_ID 除外）・keyword（ACTIVE_RESOURCE_ID 除外）・ロール可視範囲
    // （KEYWORD_INACTIVE_ID 除外）の 3 条件すべてが効いていることを 1 テストで確認する
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "Keyword")
                .param("category", "ROOM")
                .param("from", "2025-07-01T00:00:00")
                .param("to", "2025-07-01T23:59:59")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_NAME_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockAdmin
  void list_keywordWithCategoryAndTimeRangeAsAdmin_includesInactiveMatchWithinCategory()
      throws Exception {
    // findByCategoryAndKeyword（List・ADMIN・category あり・from/to 経路）。
    // ADMIN は category・keyword 条件を満たせば inactive（KEYWORD_INACTIVE_ID）も含む
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "Keyword")
                .param("category", "ROOM")
                .param("from", "2025-07-01T00:00:00")
                .param("to", "2025-07-01T23:59:59")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_NAME_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_INACTIVE_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").doesNotExist())
        .andExpect(jsonPath("$.content[?(@.id == '" + KEYWORD_DESC_ID + "')]").doesNotExist());
  }

  @Test
  @WithMockMember
  void list_blankKeyword_returnsAllVisibleResourcesWithoutKeywordFilter() throws Exception {
    // BR-02/BR-07: 空白のみの keyword は未入力として扱う
    mockMvc
        .perform(get("/api/resources").param("keyword", "   ").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[?(@.id == '" + ACTIVE_RESOURCE_ID + "')]").exists())
        .andExpect(jsonPath("$.content[?(@.id == '" + INACTIVE_RESOURCE_ID + "')]").doesNotExist());
  }

  // ---------------------------------------------------------------------------
  // GET /api/resources?sort=... — ソート順選択（BR-01〜BR-07、Issue #22）
  // ---------------------------------------------------------------------------

  @Test
  @WithMockMember
  void list_sortByNameAscending_ordersResultsByNameAscending() throws Exception {
    mockMvc
        .perform(
            get("/api/resources")
                .param("category", "VEHICLE")
                .param("sort", "name,asc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()").value(3))
        .andExpect(jsonPath("$.content[0].id").value(SORT_A_ID.toString()))
        .andExpect(jsonPath("$.content[1].id").value(SORT_B_ID.toString()))
        .andExpect(jsonPath("$.content[2].id").value(SORT_C_ID.toString()));
  }

  @Test
  @WithMockMember
  void list_sortByNameDescending_ordersResultsByNameDescending() throws Exception {
    mockMvc
        .perform(
            get("/api/resources")
                .param("category", "VEHICLE")
                .param("sort", "name,desc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(SORT_C_ID.toString()))
        .andExpect(jsonPath("$.content[1].id").value(SORT_B_ID.toString()))
        .andExpect(jsonPath("$.content[2].id").value(SORT_A_ID.toString()));
  }

  @Test
  @WithMockMember
  void list_sortByCapacityAscending_placesNullCapacityLast() throws Exception {
    // BR-04: capacity 昇順でも NULL（SORT_B_ID）は末尾
    mockMvc
        .perform(
            get("/api/resources")
                .param("category", "VEHICLE")
                .param("sort", "capacity,asc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(SORT_C_ID.toString())) // capacity=5
        .andExpect(jsonPath("$.content[1].id").value(SORT_A_ID.toString())) // capacity=10
        .andExpect(jsonPath("$.content[2].id").value(SORT_B_ID.toString())); // capacity=NULL
  }

  @Test
  @WithMockMember
  void list_sortByCapacityDescending_placesNullCapacityLast() throws Exception {
    // BR-04: capacity 降順でも NULL（SORT_B_ID）は常に末尾（方向に関わらず末尾を保証）
    mockMvc
        .perform(
            get("/api/resources")
                .param("category", "VEHICLE")
                .param("sort", "capacity,desc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(SORT_A_ID.toString())) // capacity=10
        .andExpect(jsonPath("$.content[1].id").value(SORT_C_ID.toString())) // capacity=5
        .andExpect(jsonPath("$.content[2].id").value(SORT_B_ID.toString())); // capacity=NULL
  }

  @Test
  @WithMockMember
  void list_sortUnspecified_defaultsToCreatedAtAscending() throws Exception {
    // RES-02: sort 未指定時は createdAt,asc がデフォルト
    mockMvc
        .perform(
            get("/api/resources").param("category", "VEHICLE").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(SORT_A_ID.toString())) // 2025-01-01
        .andExpect(jsonPath("$.content[1].id").value(SORT_B_ID.toString())) // 2025-02-01
        .andExpect(jsonPath("$.content[2].id").value(SORT_C_ID.toString())); // 2025-03-01
  }

  @Test
  @WithMockMember
  void list_sortWithDisallowedField_returns400ValidationError() throws Exception {
    // RES-06/BR-01: 許可されていないフィールド名は 400
    mockMvc
        .perform(
            get("/api/resources")
                .param("sort", "description,asc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  @WithMockMember
  void list_sortCombinedWithKeyword_appliesSortToFilteredResults() throws Exception {
    // BR-03: keyword で絞り込んだ結果に対して sort が適用される
    mockMvc
        .perform(
            get("/api/resources")
                .param("keyword", "Van")
                .param("sort", "name,desc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(SORT_C_ID.toString()))
        .andExpect(jsonPath("$.content[1].id").value(SORT_B_ID.toString()))
        .andExpect(jsonPath("$.content[2].id").value(SORT_A_ID.toString()));
  }

  @Test
  @WithMockMember
  void list_sortCombinedWithTimeRange_appliesSortViaAvailabilityPath() throws Exception {
    // BR-06: listWithAvailabilityFilter（手動ページネーション）経路でも sort が適用される
    mockMvc
        .perform(
            get("/api/resources")
                .param("category", "VEHICLE")
                .param("from", "2025-06-02T00:00:00")
                .param("to", "2025-06-02T23:59:59")
                .param("sort", "name,desc")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].id").value(SORT_C_ID.toString()))
        .andExpect(jsonPath("$.content[1].id").value(SORT_B_ID.toString()))
        .andExpect(jsonPath("$.content[2].id").value(SORT_A_ID.toString()));
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
          "description": "新しい会議室",
          "equipment": "プロジェクター1台",
          "notes": "貸出時は電源ケーブルも一緒にお渡しください"
        }
        """;

    mockMvc
        .perform(post("/api/resources").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("新会議室"))
        .andExpect(jsonPath("$.category").value("ROOM"))
        .andExpect(jsonPath("$.capacity").value(10))
        .andExpect(jsonPath("$.isActive").value(true))
        .andExpect(jsonPath("$.equipment").value("プロジェクター1台"))
        .andExpect(jsonPath("$.notes").value("貸出時は電源ケーブルも一緒にお渡しください"))
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
        .andExpect(jsonPath("$.isActive").value(true))
        .andExpect(jsonPath("$.equipment").value("プロジェクター1台、ホワイトボード1台"))
        .andExpect(jsonPath("$.notes").value("利用後は椅子を元の位置に戻してください"));
  }

  @Test
  @WithMockMember
  void get_resourceWithoutEquipmentAndNotes_returnsNullForNewFields() throws Exception {
    // Issue #25 受入条件: 未登録（NULL）の場合もエラーにならず null で返る
    mockMvc
        .perform(get("/api/resources/" + INACTIVE_RESOURCE_ID).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.equipment").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.notes").value(org.hamcrest.Matchers.nullValue()));
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
          "description": "改装済み",
          "equipment": "プロジェクター1台、ホワイトボード2台",
          "notes": "騒音制限あり（22時以降の利用不可）"
        }
        """;

    mockMvc
        .perform(
            put("/api/resources/" + ACTIVE_RESOURCE_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("第1会議室（改装後）"))
        .andExpect(jsonPath("$.capacity").value(12))
        .andExpect(jsonPath("$.equipment").value("プロジェクター1台、ホワイトボード2台"))
        .andExpect(jsonPath("$.notes").value("騒音制限あり（22時以降の利用不可）"));
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
