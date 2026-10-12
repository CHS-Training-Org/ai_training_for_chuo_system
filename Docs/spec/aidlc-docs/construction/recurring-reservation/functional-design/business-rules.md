# Business Rules — recurring-reservation

## ルール一覧

### 入力と検証

| # | ルール | 根拠 |
|---|---|---|
| BR-01 | `POST /api/reservations` は `recurrenceType`（省略・null は `NONE`）と `recurrenceUntil`（`yyyy-MM-dd`）を受け付ける。`recurrenceType` に定義外の値が来たら、既存の `HttpMessageNotReadableException` により 400 `VALIDATION_ERROR` | REC-02 |
| BR-02 | `recurrenceType` が `NONE` で `recurrenceUntil` が指定されたら、400 `VALIDATION_ERROR`（`ValidationException`、文言「繰り返しなしの場合、繰り返し終了日は指定できません。」） | 決定事項 7(a)、US-04 |
| BR-03 | `WEEKLY` / `MONTHLY` で `recurrenceUntil` が未指定なら、400 `VALIDATION_ERROR`（文言「繰り返し終了日は必須です。」） | 決定事項 7(b)、US-04 |
| BR-04 | `recurrenceUntil` が `startAt` の日付より前なら、400 `VALIDATION_ERROR`（文言「繰り返し終了日は開始日以降にしてください。」）。同じ日付は有効で、1 件だけ生成する | 決定事項 7(c)、US-04 |
| BR-04b | `recurrenceUntil` が `startAt` の日付から 2 年を超えるなら、400 `VALIDATION_ERROR`（文言「繰り返し終了日は開始日から 2 年以内にしてください。」）。上限は `startAt` の日付の `plusYears(2)`（2 年後の同じ日。開始日が 2 月 29 日で 2 年後が平年なら 2 月 28 日）。BR-04 の後ろで判定し、ロックより前に行う。フロントの `CreateReservationFormSchema` も同じ規則で送信前に止める（`MAX_RECURRENCE_YEARS = 2`、BE の `MAX_RECURRENCE_YEARS` と一致） | 決定事項 4（PR #150 の AI レビューで変更）、US-04 |
| BR-05 | BR-02〜BR-04 の検証は DB に触れる前に行う（リソース行のロックより前）。既存の `endAt > startAt` の検証（422）より前に判定する | 設計上の判断 |
| BR-06 | 件数そのものの上限は設けない。範囲は終了日の上限（BR-04b、開始日から 2 年以内）で抑える。毎週で最大 105 件 | 決定事項 4 |

### 日程の生成

| # | ルール | 根拠 |
|---|---|---|
| BR-07 | 1 回目は入力の `startAt`・`endAt` そのもの。`NONE` は 1 回目だけを作る | REC-03 |
| BR-08 | `WEEKLY` は `startAt` から 7 日ごと（同じ曜日・同じ時刻）。各回の開始日時の日付が `recurrenceUntil` 以前の回を作る（終了日当日を含む） | 決定事項 6、US-01 |
| BR-09 | `MONTHLY` は 1 回目の日（day of month）を基準に毎月同じ日。その月に存在しない日の月はスキップする。スキップの後も、直前の回からの積み上げではなく、基準日から数える（1 月 31 日の次は 3 月 31 日） | 決定事項 6、US-02 |
| BR-10 | 各回の長さは 1 回目の `endAt - startAt` と同じ。日をまたぐ予約も許可し、各回に同じ長さを足して終了日時を求める | 決定事項 6、US-01 |
| BR-11 | 生成した日程は開始日時の昇順。レスポンスの配列も同じ順 | 決定事項 8、US-01 |

### 重複判定とトランザクション

| # | ルール | 根拠 |
|---|---|---|
| BR-12 | 作成はクラス単位の `@Transactional` の 1 トランザクションで行い、リソース行の悲観ロック（`findByIdForUpdate`）を最初に取る（検証 BR-02〜BR-05 の後）。リソースが存在しなければ 404 | REC-05 |
| BR-13 | 生成した日程の隣り合う 2 回が重なる場合（自己重複）は、409 `RESERVATION_CONFLICT`。下書きでも同じ。長さが同じなので、隣り合う 2 回の比較だけで全体を判定できる | 決定事項 5、US-03 |
| BR-14 | 既存の `PENDING` / `APPROVED` の予約と、日程のいずれか 1 回でも重なれば、409 `RESERVATION_CONFLICT`。取得は 1 回で、重なりの判定は既存の `ResourceService.overlaps`（半開区間、境界一致の隣接は重複でない）。下書きでも、この判定は行う | 決定事項 5、US-03 |
| BR-15 | 409 のメッセージは既存の固定文言のまま。衝突した日付は含めない | 決定事項 5 |
| BR-16 | 1 件でも例外が出たら、予約も承認ステップもすべてロールバックされる（`RuntimeException`） | REC-05、US-03 |

### ステータスと承認

| # | ルール | 根拠 |
|---|---|---|
| BR-17 | 全件に同じステータスを付ける。`draft: true` なら全件 `DRAFT`（承認ステップなし）。そうでなければ、リソースが承認不要なら全件 `APPROVED`、承認が必要なら全件 `PENDING` | REC-07、REC-08、US-05 |
| BR-18 | 全件が `PENDING` のときは、予約ごとに承認ステップを 1 件作る（N 件）。承認者がいなければ 422 `APPROVER_NOT_AVAILABLE` で、全件ロールバック | REC-08、US-03、US-05 |
| BR-19 | 繰り返しの下書きの各回は、既存の更新 API の `submit: true` で 1 件ずつ正式申請する。その時点で、既存の重複判定が走る | US-05 |

### 系列の保存と独立性

| # | ルール | 根拠 |
|---|---|---|
| BR-20 | 種別が `NONE` 以外なら、全件に同じ `series_id`（1 回の作成で 1 つ採番）・`recurrence_type`・`recurrence_until` を保存する。生成が 1 件でも同じ。`NONE` の予約は `series_id` と `recurrence_until` が NULL、`recurrence_type` は `NONE` | 決定事項 2、REC-01 |
| BR-21 | DB の CHECK 制約が、種別と `series_id`・`recurrence_until` の整合を守る（`NONE` なら 2 列が NULL、`NONE` 以外なら 2 列が NOT NULL） | 設計上の判断 |
| BR-22 | 更新・キャンセル・承認・却下は、系列の 3 項目に触れず、同じ系列の他の予約に影響しない。シリーズの一括変更・一括キャンセル・一括承認の操作は提供しない | REC-04、決定事項 12、US-06 |

### レスポンスと詳細

| # | ルール | 根拠 |
|---|---|---|
| BR-23 | `POST /api/reservations` のレスポンスは常に配列（201）。`NONE` は 1 件の配列 | REC-06、US-04 |
| BR-24 | `ReservationResponse` は 5 項目（`seriesId`・`recurrenceType`・`recurrenceUntil`・`seriesCount`・`remainingCount`）を足した 17 項目。一覧・作成・更新・キャンセルでは `seriesCount` と `remainingCount` が null | REC-10、決定事項 11 |
| BR-25 | `GET /api/reservations/{id}` だけが `seriesCount`（同じ `series_id` の全ステータスの件数）と `remainingCount`（`startAt` がその予約より後の同じ `series_id` の件数、全ステータス）を返す。`series_id` が NULL の予約では null | REC-10、決定事項 9・10 |

### フロントエンド

| # | ルール | 根拠 |
|---|---|---|
| BR-26 | 予約申請フォームの「繰り返し」は Select（「繰り返さない」「毎週」「毎月」）で、初期値は「繰り返さない」。「毎週」「毎月」のときだけ、終了日（`type="date"`）の入力欄を表示し、必須にする | REC-11、US-07 |
| BR-27 | フォームは、終了日が未入力、または終了日が開始日（`startAt` の日付）より前なら、画面内のメッセージで送信を止める。「繰り返さない」では終了日を API に送らない（BR-02 の 400 を避ける） | US-04、US-07 |
| BR-28 | 登録に成功したら、返った配列の長さを使って「N 件の予約を登録しました」とトーストを出し、遷移する（通常は `/reservations`、下書きは `/reservations?status=DRAFT`）。「繰り返さない」でも「1 件の予約を登録しました」と出す | REC-11、US-07 |
| BR-29 | 409 `RESERVATION_CONFLICT` は、既存のフォーム下部の固定文言を表示し、入力は保持する。それ以外のエラーは、既存どおり再 throw する | US-03、US-07 |
| BR-30 | 詳細画面は、`recurrenceType` が `NONE` 以外のとき、繰り返しの種別、終了日、シリーズ件数、残り回数を表示する。`NONE` では欄を出さない。一覧には出さない | REC-12、US-08 |
| BR-31 | 種別のラベルは `lib/labels.ts` の定数（`NONE`=繰り返さない、`WEEKLY`=毎週、`MONTHLY`=毎月）で管理する | 既定の前提 |

## ストーリーとテストの対応

| ルール | ストーリー | テスト（種別） |
|---|---|---|
| BR-07〜BR-11 | US-01、US-02 | `RecurrenceScheduleTest`（ユニット、新規）：毎週の件数と終了日当日、終了日の前日、毎月の同日、31 日のスキップ（1 月 31 日から 5 月 31 日）、スキップ後の基準日、28 日以前はスキップなし、1 回目と同日の終了日（1 件）、`NONE`、時刻の保持 |
| BR-10 | US-01 | `ReservationServiceTest`：日をまたぐ予約で各回の長さが同じ |
| BR-02〜BR-05 | US-04 | `ReservationServiceTest`：3 つの 400 と、検証でロックを取らない（`findByIdForUpdate` が呼ばれない）。`ReservationControllerTest`：3 つの 400 の HTTP、定義外の値の 400 |
| BR-12〜BR-16 | US-03 | `ReservationServiceTest`：既存との重複で 409 かつ `save` されない、自己重複（8 日間の毎週）で 409、下書きの自己重複で 409、隣接は重複でない、既存予約の取得が 1 回。`ReservationControllerTest`（H2）：既存の予約と 1 回だけ重なる繰り返しで 409 かつ 1 件も作られない（件数を数える） |
| BR-17・BR-18 | US-05 | `ReservationServiceTest`：全件 `DRAFT`、全件 `PENDING` と承認ステップ N 回、全件 `APPROVED`、承認者なしで 422。`ReservationControllerTest`：`DRAFT` の繰り返し、承認要リソースの承認ステップの件数 |
| BR-19・BR-22 | US-05、US-06 | `ReservationControllerTest`：繰り返しの 1 件だけキャンセル・変更し、他の回が変わらない。下書きの 1 件だけ `submit` |
| BR-20 | US-01、US-04 | `ReservationControllerTest`：全件が同じ `seriesId`・種別・終了日を持つ、`NONE` は `seriesId` が null、1 件でも `WEEKLY` なら `seriesId` が付く |
| BR-21 | （非機能） | PostgreSQL での手動確認：V003 の適用、CHECK 制約が食い違った行を拒否する、`ddl-auto: validate` の起動成功（Build and Test） |
| BR-23・BR-24 | US-01、US-04 | `ReservationControllerTest`：レスポンスが配列で、昇順、17 項目。既存の作成・一覧・更新・キャンセルのテストを配列・新項目に追従 |
| BR-25 | US-08 | `ReservationServiceTest`：詳細でシリーズ件数と残り回数（全ステータス、自身を含まない、最後の回は 0）、`NONE` は null。`ReservationControllerTest`：詳細の 5 項目、一覧は件数が null |
| BR-26・BR-27 | US-07 | `reservation-form.test.tsx`：初期値が「繰り返さない」で終了日が非表示、「毎週」を選ぶと終了日が現れる（Radix Select は jsdom で開けないため、テスト内の polyfill で操作する。不安定な場合は省略可能な初期値の props で再現する）、終了日未入力・開始日より前で送信されない、「繰り返さない」で終了日が送られない。検証ルール自体は `CreateReservationFormSchema` の `safeParse` で画面なしでも検証する |
| BR-28・BR-29 | US-07 | `reservation-form.test.tsx`：成功で `toast.success` が件数付きで呼ばれ遷移する、下書きで `?status=DRAFT`、409 の固定文言と入力の保持。`server/actions/reservations.test.ts`：配列のレスポンス |
| BR-30・BR-31 | US-08 | `reservation-detail-page.test.tsx`：種別・終了日・件数・残り回数の表示、`NONE` で欄が出ない |
