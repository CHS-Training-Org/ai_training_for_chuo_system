# Integration Test Instructions（recurring-reservation）

## Purpose

予約作成・詳細・承認・キャンセルの各 API が、繰り返し予約と組み合わさって正しく動くことを確認する。モノリス構成のため、結合テストは `ReservationControllerTest`（`@SpringBootTest`、MockMvc、H2）が担う。DB 制約と Flyway は H2 では検証できないため、PostgreSQL での確認を別に行う。

## Test Scenarios

### Scenario 1: 作成 API の繰り返し（H2、自動）

- **Description**: `POST /api/reservations` の繰り返しの生成、同一の系列、昇順の配列、日またぎ
- **Test Steps / Expected Results**: `ReservationControllerTest` の `create_weekly_*`、`create_monthlyDay31_*`、`create_overnightWeekly_*`、`create_untilSameDayAsStart_*`
- **Cleanup**: `@AfterEach` が申請者の予約と承認ステップを削除する

### Scenario 2: 全件ロールバック（H2、自動）

- **Description**: 既存の `APPROVED`・`PENDING` との重複、自己重複（下書きを含む）で 409 かつ 1 件も作られない。承認者不在では 422 で、先に保存した予約も DB 上でロールバックされる。既存の `DRAFT` は重複にならない
- **Test Steps / Expected Results**: `create_oneOccurrenceConflictsWithExisting_*`、`create_existingPendingReservation*`、`create_existingDraftReservation*`、`create_occurrencesOverlapEachOther_*`、`create_weeklyApproverNotAvailable_*`

### Scenario 3: 承認フローとの併用（H2、自動）

- **Description**: 承認要リソースで全件 `PENDING` と承認ステップ N 件。APPROVER が 1 件を承認し、別の 1 件を却下しても、残りは `PENDING` のまま
- **Test Steps / Expected Results**: `create_weeklyApprovalRequired_*`、`approveAndReject_seriesOccurrences_*`

### Scenario 4: 個別管理とシリーズ情報（H2、自動）

- **Description**: 1 件だけのキャンセル・`submit` が他の回に影響しない。詳細 API だけがシリーズ件数と残り回数（全ステータス）を返し、一覧は null
- **Test Steps / Expected Results**: `create_weekly_cancelOneOccurrence*`、`create_weeklyDraft_submitOneOccurrence*`、`get_seriesReservation_*`、`get_noneReservation_*`、`list_seriesReservations_*`

### Scenario 5: V003 の Flyway マイグレーション（H2、自動）

通常のテストは Flyway を無効にして Hibernate の `create-drop` でテーブルを作るため、`V003__add_reservation_recurrence.sql` そのものは実行されない。そこで `ReservationRecurrenceMigrationTest` が、Spring を使わず `flyway-core` で実際の SQL を実行する。`./gradlew test` と CI Backend で自動実行される。

- **Setup**: テストごとに別名のインメモリ H2（PostgreSQL 互換モード）を作る。Flyway と検証用の SQL が同じ接続を使う（別の接続で適用すると、H2 が「The database has been closed」で CHECK 制約の評価に失敗するため）。`flyway-core` は `implementation` の依存にあり、H2 は `testRuntimeOnly` のため、`build.gradle.kts` の変更は不要
- **Test Steps**: V001 から V002 を適用し、V002 時点の `reservations` に既存データ 3 件（`APPROVED`、`DRAFT`、`CANCELLED`）を入れる。V003 を適用する
- **Expected Results**: V003 だけが適用される。既存データが保持され、`recurrence_type` が `NONE`、`recurrence_until` と `series_id` が NULL になる。2 つの CHECK 制約とインデックスが存在し、既存の行が制約を満たす。整合した行は受け付け、不整合な 5 通りは拒否する。繰り返しの列を省略した INSERT は `NONE` になる
- **Cleanup**: インメモリ DB はテストごとに破棄される
- **限界**: H2 は PostgreSQL ではない。型の厳密さなど PostgreSQL 固有の挙動は保証しないため、次の Scenario 6 の PostgreSQL での確認は引き続き行う

### Scenario 6: V003 と PostgreSQL（手動、2026-10-12 に実施済み）

CI Backend には PostgreSQL がないため、使い捨ての PostgreSQL 16 で確認した。手順と結果は次のとおり。

1. ローカルの `postgres:16` イメージで使い捨てのコンテナを起動する（`docker run -d --rm --name bookflow-v003-check -e POSTGRES_DB=bookflow -e POSTGRES_USER=bookflow -e POSTGRES_PASSWORD=bookflow postgres:16`。既存の `postgres-data` ボリュームには触れない）
2. **既存データへの影響**：別のデータベースに V001 と V002 を適用し、予約を 1 件入れてから V003 を適用した。**結果**：その行は `recurrence_type = NONE`、`recurrence_until` と `series_id` は NULL になり、影響を受けなかった
3. **CHECK 制約**：次の 6 通りを INSERT した。**結果**：期待どおり（a と f は成功、b から e は拒否）
   - a) `WEEKLY` で終了日と `series_id` がそろっている：成功
   - b) `NONE` なのに `series_id` がある：`chk_reservations_series` に違反して拒否
   - c) `WEEKLY` なのに `series_id` が NULL：同上
   - d) `WEEKLY` なのに終了日が NULL：同上
   - e) 定義外の種別 `DAILY`：`chk_reservations_recurrence_type` に違反して拒否
   - f) `NONE` で 2 列が NULL：成功
4. **インデックスと制約の一覧**：`\d reservations` で `idx_reservations_series_id` と 2 つの CHECK が存在することを確認した
5. **アプリの起動**：ビルドした jar を、同じ Docker ネットワークの開発用イメージ（JDK 25）で起動した。**結果**：Flyway が「`Successfully applied 3 migrations`、now at version v003」と出力し、`ddl-auto: validate` を通って `Started BookflowApplication` に至った（`Reservation` の列と V003 が整合している）
6. 使い捨てのコンテナは削除した

> この環境では、Docker のポート公開がワークスペースの localhost に届かず、jar を `docker cp` でコンテナに渡して起動した。通常のローカル環境では、`docker compose -f .devcontainer/docker-compose.yml up -d` のあと `./gradlew bootRun` で同じ確認ができる。

## Run Integration Tests

```bash
cd backend && ./gradlew test --max-workers=1 --tests "*ReservationControllerTest"
```

- **Expected Results**: 68 件が成功

マイグレーションテストだけを実行する場合：

```bash
cd backend && ./gradlew test --max-workers=1 --tests "*ReservationRecurrenceMigrationTest"
```

- **Expected Results**: 7 件が成功
- **Logs Location**: `backend/build/reports/tests/test/index.html`

## 未確認の項目

- **ロック下の並行性**：悲観ロックの並行テストはない。`e2e-test-instructions.md` の手順 C で確認する
- **API を JWT つきで呼ぶ確認**：開発環境ではブラウザサインインが動かない（cognito-local が http のため）。API の挙動は MockMvc の結合テストで検証している
