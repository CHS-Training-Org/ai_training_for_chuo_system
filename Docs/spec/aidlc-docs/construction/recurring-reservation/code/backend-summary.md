# Backend Code Summary — recurring-reservation

Code Generation の Step 2 から Step 7 の記録。設計は `functional-design/` の 4 ファイルに従った。

## 変更ファイル

**Created**

- `backend/src/main/resources/db/migration/V003__add_reservation_recurrence.sql`：3 列（`recurrence_type` NOT NULL DEFAULT `'NONE'`、`recurrence_until`、`series_id`）、CHECK 2 つ（`chk_reservations_recurrence_type`、`chk_reservations_series`）、`idx_reservations_series_id`
- `backend/src/main/java/com/example/bookflow/domain/RecurrenceType.java`：`NONE` / `WEEKLY` / `MONTHLY`
- `backend/src/main/java/com/example/bookflow/application/RecurrenceSchedule.java`：日付生成の純粋関数（`startDates`）
- `backend/src/test/java/com/example/bookflow/application/RecurrenceScheduleTest.java`：21 件

**Modified**

- `domain/Reservation.java`：3 フィールドと getter、`joinSeries`。`create` は 7 引数のまま
- `domain/ReservationRepository.java`：`countBySeriesId`、`countBySeriesIdAndStartAtAfter`
- `presentation/dto/CreateReservationRequest.java`：`recurrenceType`・`recurrenceUntil`、`recurrence()`
- `presentation/dto/ReservationResponse.java`：17 項目に、`from(r)` と `from(r, seriesCount, remainingCount)`
- `application/ReservationService.java`：`create` を `List<ReservationResponse>` に。検証、日程の生成、自己重複、既存予約との重複、作成、承認ステップを private メソッドに分けた。`get` にシリーズ件数と残り回数
- `presentation/ReservationController.java`：`create` の戻り値を `List<ReservationResponse>` に
- `ReservationServiceTest.java`：構成子 8 箇所の追従、既存 5 件を `.get(0)` に追従、`CreateRecurring`（23 件）と `GetSeries`（3 件）を追加
- `ReservationControllerTest.java`：既存の作成系 3 件を配列の JSON パスに追従、繰り返し・詳細・OpenAPI・既存の PENDING/DRAFT との重複・承認者不在のロールバック・各回の承認と却下の計 26 件を追加

## 設計からの差分と、実装中に見つけた事実

- **`@ColumnDefault("'NONE'")` を `recurrenceType` に付けた**：テストは H2 の `create-drop`（Flyway 無効）でテーブルを作る。テスト 4 ファイルが `INSERT INTO reservations` を生 SQL で実行しており、新しい NOT NULL 列に既定値がないと、列を省略した INSERT が NOT NULL 違反になる。V003 の `DEFAULT 'NONE'` と同じ既定値を、生成されるテーブルにも持たせた。本番の `ddl-auto: validate` は既定値を検証しない。Functional Design では見落としていた点で、設計書には反映していない
- **フィールドの初期値 `RecurrenceType.NONE`**：テストが `new Reservation() {}` とリフレクションで組み立てるため、`create` を通らないエンティティでも `from` が NPE にならないようにした
- **保存は `saveAll` でなく `save` のループ**：既存テストが `save` をスタブしており、`saveAll` は未スタブで空のリストを返すため。`saveAll` も内部では 1 件ずつ `save` を呼ぶので、DB への挙動は同じ
- **`ReservationResponse` の構成子呼び出し 1 箇所は DTO 自身**（`build` メソッド）で、テスト側に呼び出しはなかった。計画の「所在を検索で特定」の結果

## 検証結果

- `./gradlew spotlessCheck checkstyleMain test --max-workers=1`：成功。テストは全 375 件（`ReservationControllerTest` は 68 件）で、失敗・エラーなし
- Checkstyle の警告 4 件（`Resource.java` の `ParameterNumber` 2 件、`ReservationRepository` の既存メソッド名 2 件）は、今回の変更前から存在する
- **OpenAPI**：`GET /v3/api-docs` を取得できたため、`apiDocs_reflectsRecurrenceFieldsAndArrayResponse` で、5 つの新項目がスキーマにあることと、`POST /api/reservations` の 201 が配列であることを検証した
- **break-and-verify**（5 件、すべて失敗を確認して復元）：自己重複の検出を外す（6 件失敗）、既存予約との重複判定を外す（9 件）、月次を丸める（9 件）、`joinSeries` を呼ばない（10 件）、検証をロックの後ろへ移す（5 件）

## Step 12 のストーリー照合で追加した結合テスト

照合の結果、ストーリーの Scenario に対してテストが足りない 4 点を、`ReservationControllerTest` に追加した。

- 既存の `PENDING` の予約との重複で 409（US-03）、既存の `DRAFT` は重複にならず全件作られる
- 承認者がいない状態で承認要リソースに繰り返しを申請すると、422 `APPROVER_NOT_AVAILABLE` になり、保存済みの予約が DB 上でロールバックされる（予約は先に保存され、承認ステップの作成で例外になるため、ロールバックが実際に効いていることを確認できる。US-03）
- 承認が必要なリソースの繰り返し予約で、APPROVER が 1 回目を承認し、2 回目を却下しても、3 回目は `PENDING` のまま、系列は変わらない（US-05）
- 409 のメッセージが既存の固定文言のままで、衝突した日付を含まない（US-03）

## 自動テストで検証できていないこと（Build and Test に引き継ぐ）

- **V003 の SQL と 2 つの CHECK 制約**：テストは Flyway を実行しない。PostgreSQL での適用と、食い違った行（例：`NONE` なのに `series_id` が非 NULL）を DB が拒否することの確認が必要
- **`ddl-auto: validate` での起動**：`Reservation` の `@Column` と V003 の列の整合は、PostgreSQL に接続した起動でしか確認できない
- **ロック下の一括作成の並行性**：悲観ロックの並行テストはなく、Mockito と H2 の逐次実行のみ。同時に 2 つの繰り返し申請を送る確認は手動になる
- **終了日の上限いっぱいの所要時間**：終了日を開始日から 2 年以内に限った（下の「PR #150 の AI レビュー対応」）。毎週 105 件の一括作成は、H2 の結合テストでは通るが、PostgreSQL とロック下での所要時間は未計測

## PR #150 の AI レビュー対応（終了日の上限）

AI レビューの Should fix に対応し、繰り返し終了日の上限（開始日から 2 年以内）を追加した。要件の決定事項 4（件数の上限なし）を、終了日の上限に変更したもの。

- `ReservationService.validateRecurrence`：`recurrenceUntil` が `startAt` の日付の `plusYears(2)` を超えたら、`ValidationException`（400 `VALIDATION_ERROR`、「繰り返し終了日は開始日から 2 年以内にしてください。」）。ロックより前に判定する。定数は `MAX_RECURRENCE_YEARS = 2`
- 上限は 2 年後の同じ日まで有効。開始日が 2 月 29 日で 2 年後が平年なら、2 月 28 日まで（`LocalDate.plusYears` の丸め）
- テスト：`ReservationServiceTest`（ちょうど 2 年で 105 件、翌日で 400 かつロックを取らない、毎月、下書き、2 月 29 日、`NONE` は終了日の指定自体が不可）、`ReservationControllerTest`（超過で 400 と固定文言と 0 件、ちょうど 2 年で 105 件）

## PR #150 の AI レビュー対応（Flyway マイグレーションテスト）

AI レビューの観点 1「要求整合性」が、「CI Backend では Flyway が無効で、V003 の正常実行と既存データへの影響を差分や CI で自動確認できない」ために判定不能になった。これに対し、V003 の SQL を実際に実行する自動テストを追加した。既存機能の実装は変更していない。

**追加したもの**：`backend/src/test/java/com/example/bookflow/migration/ReservationRecurrenceMigrationTest.java`（7 件）

- V001 から V002 を `flyway-core` で適用し、V002 時点の `reservations` に既存データを 3 件（`APPROVED`・`DRAFT`・`CANCELLED`）登録してから、V003 を適用する
- V003 だけが適用されること（`migrationsExecuted` が 1、バージョンが 3）
- 既存の行の件数と、V003 が触れない 10 列の値が変わらないこと
- 既存の行が `recurrence_type = NONE`、`recurrence_until` と `series_id` が NULL になること
- 2 つの CHECK 制約と `idx_reservations_series_id` が存在し、既存の行が制約の条件を満たす（違反する行が 0 件）こと
- 制約が、整合した行 3 通りを受け付け、不整合な行 5 通りを拒否すること。繰り返しの列を省略した INSERT が `NONE` になること

**実行方法**：Spring を使わない JUnit 5 のテストで、`src/test` にあるため、通常の `./gradlew test` と CI Backend（`./gradlew test`）で自動実行される。`flyway-core` は `implementation` の依存、H2 は `testRuntimeOnly` にすでにあり、`build.gradle.kts` の変更は不要だった。

**実装中に見つけた事実**

- Flyway に URL を渡して別の接続で適用すると、H2 が適用後の CHECK 制約の評価で「The database has been closed」を返し、既存データの INSERT が失敗した。マイグレーションと検証を同じ接続で行うため、`SingleConnectionDataSource`（close を無視する）を Flyway に渡し、検証の SQL にも同じ接続を使う形にした。V001 から V003 の SQL 自体は、H2 の PostgreSQL 互換モードでそのまま実行できた
- Flyway のバージョンは `"003"` と返るため、文字列ではなく `MigrationVersion` で比較する
- H2 2.4.240 は、Flyway が検証済みの最新（2.3.232）より新しいという警告を出すが、動作に問題はない

**限界**：H2 は PostgreSQL ではない。型の厳密さなど PostgreSQL 固有の挙動は保証しないため、使い捨ての PostgreSQL 16 での手動確認（`integration-test-instructions.md` の Scenario 6）は引き続き有効で、2026-10-12 に実施済み。

**break-and-verify**（V003 を一時的に壊し、すべて失敗を確認して復元）：

| 壊し方 | 失敗したテストの件数 |
|---|---|
| `NOT NULL` の列から `DEFAULT 'NONE'` を外す（既存データに足せない） | 9 件（マイグレーション自体が失敗） |
| DDL の既定値を `'WEEKLY'` にする（既存データが CHECK を満たさない） | 9 件 |
| 末尾に `DELETE FROM reservations` を足す | 4 件 |
| 末尾に `UPDATE reservations SET purpose = 'x'` を足す | 3 件 |
| `chk_reservations_series` を外す | 4 件 |
| `chk_reservations_recurrence_type` を外す | 4 件 |
| `idx_reservations_series_id` を外す | 3 件 |

最初の試行で、既定値を `WEEKLY` に変える置換が SQL 冒頭のコメント内の文字列に当たり、DDL が壊れていなかったため 0 件失敗になった。DDL の行を狙って直し、9 件失敗を確認した。

**検証**：`./gradlew spotlessCheck checkstyleMain test build --max-workers=1` が成功（テスト全 390 件、失敗 0）。`checkstyleTest` の警告は、新しいテストを含め `MethodName`（ADR-018 の命名規約）のみ。
