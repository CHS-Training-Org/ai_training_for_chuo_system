package com.example.bookflow.migration;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * V003（繰り返し予約の列・制約・インデックス）の Flyway マイグレーションテスト（ADR-018 準拠）。
 *
 * <p>通常のテストは Flyway を無効にして Hibernate の {@code create-drop} でテーブルを作る（{@code
 * application-test.yml}）ため、{@code V003__add_reservation_recurrence.sql} そのものは実行されない。このテストは Spring
 * を使わず、{@code flyway-core} で実際の SQL を実行して、次を自動で確認する。
 *
 * <ul>
 *   <li>V001・V002 を適用した状態（V002 時点の {@code reservations}）に既存データを登録してから、V003 を適用できること
 *   <li>既存データが保持され、{@code recurrence_type = 'NONE'}、{@code recurrence_until}・{@code series_id} が
 *       NULL になること
 *   <li>V003 の CHECK 制約（種別の値、種別と系列の整合）とインデックスが存在し、既存の行がその制約を満たすこと
 * </ul>
 *
 * <p>DB は H2（PostgreSQL 互換モード）で、CI Backend でも動く。PostgreSQL 固有の挙動（型の厳密さなど）までは保証しないため、PostgreSQL
 * での確認は Build and Test の手順（{@code integration-test-instructions.md}）で別に行う。
 *
 * <p>テスト命名規約（ADR-018）: {@code methodName_condition_expectedBehavior}
 */
class ReservationRecurrenceMigrationTest {

  private static final String MIGRATION_LOCATION = "classpath:db/migration";

  private static final UUID DEPT_ID = UUID.fromString("50000000-0000-0000-0000-000000000001");
  private static final UUID USER_ID = UUID.fromString("50000000-0000-0000-0000-000000000002");
  private static final UUID RESOURCE_ID = UUID.fromString("50000000-0000-0000-0000-000000000010");
  private static final UUID APPROVED_ID = UUID.fromString("50000000-0000-0000-0000-000000000020");
  private static final UUID DRAFT_ID = UUID.fromString("50000000-0000-0000-0000-000000000021");
  private static final UUID CANCELLED_ID = UUID.fromString("50000000-0000-0000-0000-000000000022");

  private static final UUID[] EXISTING_IDS = {APPROVED_ID, DRAFT_ID, CANCELLED_ID};

  private Connection connection;
  private DataSource dataSource;

  @BeforeEach
  void setUp() throws SQLException {
    // テストごとに別の名前のインメモリ DB を使う（互いに影響しない）
    String url =
        "jdbc:h2:mem:flyway_v003_"
            + UUID.randomUUID().toString().replace("-", "")
            + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
    connection = DriverManager.getConnection(url, "sa", "");
    // Flyway にも同じ接続を使わせる（close は無視する）。
    // 別の接続で適用すると、H2 が「The database has been closed」で、適用後の CHECK 制約の評価に失敗するため、
    // マイグレーションと検証を同じ接続（セッション）で行う
    dataSource = new SingleConnectionDataSource(connection, true);
  }

  @AfterEach
  void tearDown() throws SQLException {
    connection.close();
  }

  private Flyway flyway(String targetVersion) {
    var config =
        Flyway.configure().dataSource(dataSource).locations(MIGRATION_LOCATION).cleanDisabled(true);
    if (targetVersion != null) {
      config.target(targetVersion);
    }
    return config.load();
  }

  /** 最新（V003）まで適用する。 */
  private MigrateResult migrateToLatest() {
    return flyway(null).migrate();
  }

  /** V001・V002 だけを適用し、V002 時点の reservations に既存データを 3 件登録する。 */
  private void migrateToV002AndInsertExistingData() throws SQLException {
    MigrateResult upToV002 = flyway("2").migrate();
    assertThat(upToV002.success).isTrue();
    assertThat(upToV002.migrationsExecuted).isEqualTo(2);
    // V003 の列がまだ存在しない（V002 時点であること）
    assertThat(columnNames("RESERVATIONS")).doesNotContain("RECURRENCE_TYPE", "SERIES_ID");

    LocalDateTime created = LocalDateTime.of(2025, 6, 1, 9, 0);
    execute("INSERT INTO departments (id, name) VALUES (?, ?)", DEPT_ID, "テスト部");
    execute(
        "INSERT INTO users (id, cognito_sub, name, email, department_id, role, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?)",
        USER_ID,
        "migration-test-sub",
        "移行テスト",
        "migration@example.com",
        DEPT_ID,
        "MEMBER",
        Timestamp.valueOf(created));
    execute(
        "INSERT INTO resources (id, name, category, requires_approval, is_active, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        RESOURCE_ID,
        "移行テスト会議室",
        "ROOM",
        false,
        true,
        Timestamp.valueOf(created));
    insertReservation(APPROVED_ID, "APPROVED", 10, 5);
    insertReservation(DRAFT_ID, "DRAFT", 11, null);
    insertReservation(CANCELLED_ID, "CANCELLED", 12, 3);
  }

  private void insertReservation(UUID id, String status, int day, Integer attendees)
      throws SQLException {
    execute(
        "INSERT INTO reservations (id, resource_id, requester_id, start_at, end_at, purpose,"
            + " attendees_count, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        USER_ID,
        Timestamp.valueOf(LocalDateTime.of(2025, 6, day, 10, 0)),
        Timestamp.valueOf(LocalDateTime.of(2025, 6, day, 12, 0)),
        "既存の予約 " + status,
        attendees,
        status,
        Timestamp.valueOf(LocalDateTime.of(2025, 6, 1, 9, 0)),
        Timestamp.valueOf(LocalDateTime.of(2025, 6, 2, 9, 0)));
  }

  /** V001〜V002 の既存列（V003 が触れない列）の値を、id の順で文字列にして返す。 */
  private List<String> existingColumnsSnapshot() throws SQLException {
    List<String> rows = new ArrayList<>();
    try (PreparedStatement ps =
            connection.prepareStatement(
                "SELECT id, resource_id, requester_id, start_at, end_at, purpose, attendees_count,"
                    + " status, created_at, updated_at FROM reservations ORDER BY id");
        ResultSet rs = ps.executeQuery()) {
      while (rs.next()) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 10; i++) {
          sb.append(rs.getObject(i)).append('|');
        }
        rows.add(sb.toString());
      }
    }
    return rows;
  }

  private void execute(String sql, Object... params) throws SQLException {
    try (PreparedStatement ps = connection.prepareStatement(sql)) {
      for (int i = 0; i < params.length; i++) {
        ps.setObject(i + 1, params[i]);
      }
      ps.executeUpdate();
    }
  }

  private List<String> columnNames(String table) throws SQLException {
    List<String> names = new ArrayList<>();
    try (PreparedStatement ps =
        connection.prepareStatement(
            "SELECT column_name FROM information_schema.columns WHERE table_name = ?")) {
      ps.setString(1, table);
      try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
          names.add(rs.getString(1));
        }
      }
    }
    return names;
  }

  private List<String> queryStrings(String sql) throws SQLException {
    List<String> values = new ArrayList<>();
    try (PreparedStatement ps = connection.prepareStatement(sql);
        ResultSet rs = ps.executeQuery()) {
      while (rs.next()) {
        values.add(rs.getString(1));
      }
    }
    return values;
  }

  /** 繰り返しの列を指定して reservations に 1 行を挿入し、DB が受け付けたかを返す。 */
  private boolean insertAccepted(String type, String until, UUID seriesId) {
    try {
      execute(
          "INSERT INTO reservations (id, resource_id, requester_id, start_at, end_at, purpose,"
              + " status, created_at, updated_at, recurrence_type, recurrence_until, series_id)"
              + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          UUID.randomUUID(),
          RESOURCE_ID,
          USER_ID,
          Timestamp.valueOf(LocalDateTime.of(2026, 11, 2, 10, 0)),
          Timestamp.valueOf(LocalDateTime.of(2026, 11, 2, 11, 0)),
          "制約の確認",
          "PENDING",
          Timestamp.valueOf(LocalDateTime.of(2026, 6, 1, 9, 0)),
          Timestamp.valueOf(LocalDateTime.of(2026, 6, 1, 9, 0)),
          type,
          until == null ? null : java.sql.Date.valueOf(until),
          seriesId);
      return true;
    } catch (SQLException e) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // V003 の適用と既存データへの影響
  // ---------------------------------------------------------------------------

  @Test
  void migrate_v003OnExistingData_succeedsAndAppliesOnlyV003() throws Exception {
    migrateToV002AndInsertExistingData();

    MigrateResult result = migrateToLatest();

    assertThat(result.success).isTrue();
    assertThat(result.migrationsExecuted).isEqualTo(1);
    assertThat(flyway(null).info().current().getVersion())
        .isEqualTo(MigrationVersion.fromVersion("3"));
    assertThat(columnNames("RESERVATIONS"))
        .contains("RECURRENCE_TYPE", "RECURRENCE_UNTIL", "SERIES_ID");
  }

  @Test
  void migrate_v003OnExistingData_keepsAllExistingRowsAndColumns() throws Exception {
    migrateToV002AndInsertExistingData();
    List<String> before = existingColumnsSnapshot();
    assertThat(before).hasSize(3);

    migrateToLatest();

    // 件数・id・日時・目的・参加人数・ステータスなど、V003 が触れない列がすべて同じ値のまま
    assertThat(existingColumnsSnapshot()).isEqualTo(before);
  }

  @Test
  void migrate_v003OnExistingData_setsRecurrenceTypeNoneAndNullsForExistingRows() throws Exception {
    migrateToV002AndInsertExistingData();

    migrateToLatest();

    for (UUID id : EXISTING_IDS) {
      try (PreparedStatement ps =
          connection.prepareStatement(
              "SELECT recurrence_type, recurrence_until, series_id FROM reservations WHERE id = ?")) {
        ps.setObject(1, id);
        try (ResultSet rs = ps.executeQuery()) {
          assertThat(rs.next()).as("既存の予約 %s が残っている", id).isTrue();
          assertThat(rs.getString("recurrence_type")).as("recurrence_type").isEqualTo("NONE");
          assertThat(rs.getObject("recurrence_until")).as("recurrence_until").isNull();
          assertThat(rs.getObject("series_id")).as("series_id").isNull();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // V003 の CHECK 制約とインデックス
  // ---------------------------------------------------------------------------

  @Test
  void migrate_v003OnExistingData_existingRowsSatisfyTheCheckConstraints() throws Exception {
    migrateToV002AndInsertExistingData();

    migrateToLatest();

    // 制約が存在する（ADD CONSTRAINT は既存の行を検証するため、成功していれば既存の行は制約を満たす）
    assertThat(
            queryStrings(
                "SELECT constraint_name FROM information_schema.table_constraints"
                    + " WHERE table_name = 'RESERVATIONS' AND constraint_type = 'CHECK'"))
        .contains("CHK_RESERVATIONS_RECURRENCE_TYPE", "CHK_RESERVATIONS_SERIES");
    // 念のため、制約が表す条件を既存の行に直接当てて、違反する行が 0 件であることを確かめる
    List<String> violations =
        queryStrings(
            "SELECT CAST(COUNT(*) AS VARCHAR) FROM reservations WHERE NOT ("
                + " recurrence_type IN ('NONE', 'WEEKLY', 'MONTHLY')"
                + " AND ((recurrence_type = 'NONE' AND series_id IS NULL AND recurrence_until IS NULL)"
                + " OR (recurrence_type <> 'NONE' AND series_id IS NOT NULL"
                + " AND recurrence_until IS NOT NULL)))");
    assertThat(violations).containsExactly("0");
  }

  @Test
  void migrate_v003_createsSeriesIdIndex() throws Exception {
    migrateToV002AndInsertExistingData();

    migrateToLatest();

    assertThat(
            queryStrings(
                "SELECT index_name FROM information_schema.indexes"
                    + " WHERE table_name = 'RESERVATIONS'"))
        .contains("IDX_RESERVATIONS_SERIES_ID");
  }

  @Test
  void migrate_v003_checkConstraintsAcceptConsistentRowsAndRejectInconsistentRows()
      throws Exception {
    migrateToV002AndInsertExistingData();
    migrateToLatest();
    UUID seriesId = UUID.randomUUID();

    // 受け付ける: 繰り返さない（NONE・NULL・NULL）、繰り返し（種別・終了日・系列がそろう）
    assertThat(insertAccepted("NONE", null, null)).as("NONE・NULL・NULL").isTrue();
    assertThat(insertAccepted("WEEKLY", "2026-11-16", seriesId)).as("WEEKLY・終了日・系列").isTrue();
    assertThat(insertAccepted("MONTHLY", "2026-12-02", seriesId)).as("MONTHLY・終了日・系列").isTrue();

    // 拒否する: 種別と系列の不整合、定義外の種別
    assertThat(insertAccepted("NONE", null, seriesId)).as("NONE なのに series_id").isFalse();
    assertThat(insertAccepted("NONE", "2026-11-16", null)).as("NONE なのに終了日").isFalse();
    assertThat(insertAccepted("WEEKLY", "2026-11-16", null))
        .as("WEEKLY なのに series_id なし")
        .isFalse();
    assertThat(insertAccepted("WEEKLY", null, seriesId)).as("WEEKLY なのに終了日なし").isFalse();
    assertThat(insertAccepted("DAILY", "2026-11-16", seriesId)).as("定義外の種別").isFalse();
  }

  @Test
  void migrate_v003_recurrenceTypeDefaultsToNoneWhenOmittedOnInsert() throws Exception {
    migrateToV002AndInsertExistingData();
    migrateToLatest();
    UUID id = UUID.randomUUID();

    // 繰り返しの列を省略した INSERT（V003 を知らない既存の SQL を想定）は、NONE として入る
    execute(
        "INSERT INTO reservations (id, resource_id, requester_id, start_at, end_at, purpose,"
            + " status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id,
        RESOURCE_ID,
        USER_ID,
        Timestamp.valueOf(LocalDateTime.of(2026, 12, 1, 10, 0)),
        Timestamp.valueOf(LocalDateTime.of(2026, 12, 1, 11, 0)),
        "列を省略した INSERT",
        "PENDING",
        Timestamp.valueOf(LocalDateTime.of(2026, 6, 1, 9, 0)),
        Timestamp.valueOf(LocalDateTime.of(2026, 6, 1, 9, 0)));

    assertThat(queryStrings("SELECT recurrence_type FROM reservations WHERE id = '" + id + "'"))
        .containsExactly("NONE");
  }
}
