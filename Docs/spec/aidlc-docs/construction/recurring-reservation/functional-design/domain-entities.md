# Domain Entities — recurring-reservation

## データベース（V003）

`reservations` に 3 列と制約・インデックスを加える。既存の列とデータは変えない。V002 の `ALTER TABLE ... ADD COLUMN` が H2 と PostgreSQL の両方で通る前例になる。

| 列 | 型 | NULL | 既定値 | 意味 |
|---|---|---|---|---|
| `recurrence_type` | `VARCHAR(10)` | NOT NULL | `'NONE'` | 繰り返しの種別（`NONE` / `WEEKLY` / `MONTHLY`） |
| `recurrence_until` | `DATE` | 許容 | なし | 繰り返しの終了日（`NONE` では NULL） |
| `series_id` | `UUID` | 許容 | なし | 同じ繰り返しで作った予約を束ねる ID（`NONE` では NULL） |

- **CHECK `chk_reservations_recurrence_type`**：`recurrence_type IN ('NONE', 'WEEKLY', 'MONTHLY')`
- **CHECK `chk_reservations_series`**：`(recurrence_type = 'NONE' AND series_id IS NULL AND recurrence_until IS NULL) OR (recurrence_type <> 'NONE' AND series_id IS NOT NULL AND recurrence_until IS NOT NULL)`。3 列が食い違った行を作らせない。既存の行は `NONE`・NULL・NULL でこの条件を満たす
- **インデックス `idx_reservations_series_id`**：`series_id` に付ける。シリーズ件数と残り回数の検索のため
- **ファイル名**：`V003__add_reservation_recurrence.sql`
- **検証の制約**：テストは H2 の `create-drop` で Flyway が無効のため、この SQL と 2 つの CHECK は自動テストで実行されない。PostgreSQL でのローカル起動で、マイグレーションの成功と、`ddl-auto: validate` が通ることを確認する（Build and Test の手動確認事項）

## `domain/RecurrenceType`（新規）

`NONE` / `WEEKLY` / `MONTHLY` の enum。`ReservationStatus` と同じく `domain/` に置き、`@Enumerated(EnumType.STRING)` で保存する。

## `domain/Reservation`（変更）

追加するフィールド（列名は `@Column` で明示する）。

- `recurrenceType`（`RecurrenceType`、`@Enumerated(STRING)`、`nullable = false`、`length = 10`）
- `recurrenceUntil`（`LocalDate`、NULL 許容）
- `seriesId`（`UUID`、NULL 許容）

追加するメソッド。

- `joinSeries(UUID seriesId, RecurrenceType type, LocalDate until)`：系列の 3 項目を設定する。`create` の直後に、繰り返しのときだけ Service が呼ぶ。`updatedAt` は変えない（作成直後のため）
- `getRecurrenceType()`・`getRecurrenceUntil()`・`getSeriesId()`

変更しないもの。

- `create` の署名（7 引数）と中身。`create` は `recurrenceType = NONE`、他は NULL で初期化する
- `update`・`submit`・`cancel`・`markApproved`・`markRejected`。どれも系列の 3 項目に触れないため、1 件の変更・キャンセル・承認が、同じ系列の他の予約に影響しない

## `domain/ReservationRepository`（変更）

派生クエリを 2 つ足す。JPQL は書かない。

- `long countBySeriesId(UUID seriesId)`：シリーズ件数（全ステータス）
- `long countBySeriesIdAndStartAtAfter(UUID seriesId, LocalDateTime startAt)`：残り回数（指定した開始日時より後の件数。自身は `startAt` が等しいため含まれない）

既存の `findByResource_IdAndStatusIn`（重複判定用）は、そのまま使う。

## `presentation/dto/CreateReservationRequest`（変更）

末尾に 2 項目を足して 8 項目にする。

| 項目 | 型 | 検証 |
|---|---|---|
| `recurrenceType` | `RecurrenceType` | なし（`null` は `NONE` として扱う）。不正な値は `HttpMessageNotReadableException` で 400 |
| `recurrenceUntil` | `LocalDate`（`yyyy-MM-dd`） | Bean Validation では検証せず、Service で検証する（BR-02〜BR-04） |

`recurrenceType` を null 安全に返す `recurrence()` を足す（`isDraft()` と同じ流儀）。

## `presentation/dto/ReservationResponse`（変更）

12 項目に 5 項目を足して 17 項目にする。

| 項目 | 型 | 値 |
|---|---|---|
| `seriesId` | `UUID` | `NONE` では null |
| `recurrenceType` | `String` | `NONE` / `WEEKLY` / `MONTHLY`（`status` と同じく `name()`） |
| `recurrenceUntil` | `LocalDate` | `NONE` では null |
| `seriesCount` | `Integer` | 詳細 API だけが値を入れる。それ以外と `NONE` は null |
| `remainingCount` | `Integer` | 同上 |

- `from(Reservation r)`：シリーズ件数と残り回数を null にする（一覧・作成・更新・キャンセル用）
- `from(Reservation r, long seriesCount, long remainingCount)`：詳細用。`seriesId` が null の予約には使わない（Service が分岐する）
- 構成子の呼び出し：`new ReservationResponse(` は 1 箇所。Code Generation で更新する

## `application/RecurrenceSchedule`（新規、純粋関数）

状態を持たない `final` クラス。DB・Spring に依存しない。`UsageCalculator`（利用実績ユニット）と同じ位置づけで、ユニットテストの中心になる。

- `static List<LocalDateTime> startDates(RecurrenceType type, LocalDateTime firstStartAt, LocalDate until)`：各回の開始日時を、昇順で返す（1 回目を含む）。`NONE` は 1 回目だけを返す
- アルゴリズムは `business-logic-model.md` の「繰り返し日の生成」に定義する

## 型の対応（フロントエンドとのやり取り）

| 項目 | backend | JSON | frontend |
|---|---|---|---|
| `recurrenceType` | `RecurrenceType` | `"NONE"` / `"WEEKLY"` / `"MONTHLY"` | `RecurrenceTypeSchema`（新規 enum） |
| `recurrenceUntil` | `LocalDate` | `"2026-11-23"` | `z.string()`（日付のみ） |
| `seriesId` | `UUID` | UUID 文字列または null | `z.string().uuid().nullish()` |
| `seriesCount`・`remainingCount` | `Integer` | 整数または null | `z.number().int().nullish()` |
