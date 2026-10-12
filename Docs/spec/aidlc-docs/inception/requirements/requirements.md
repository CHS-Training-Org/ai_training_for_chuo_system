# Requirements — ユニット: recurring-reservation（繰り返し予約）

## Intent Analysis Summary

- **User Request**: 毎週・毎月の繰り返しパターンを 1 回の操作で一括登録できるようにする（GitHub Issue #31、ビジネス要求シート `docs-next/docs/spec/enhancements/intermediate/recurring-reservation.md`）
- **Request Type**: Enhancement（既存の予約作成 API・予約申請フォームの拡張。ユースケース UC-03「予約申請・管理」の拡張）
- **Scope Estimate**: Multiple Components（frontend + backend 両方、DB マイグレーションあり）
- **Complexity Estimate**: Moderate（日付生成、全件を 1 トランザクションで作る重複チェック、API のレスポンス形の破壊的変更、承認ステップ N 件）
- **Requirements Depth**: Standard

## 機能要件

要件 ID は `REC-` を採番する。ビジネス要求シートの `RSV-01`〜`05` は、`requirements.md` の既存 `RSV-01`〜`07`（一覧・詳細・キャンセル・編集）と衝突するため使わない。ユースケースはシートのとおり UC-03 の拡張とし、新しい UC は採番しない。

| # | 要件 | シートの要件 |
|---|------|--------------|
| REC-01 | `reservations` に `recurrence_type`（`NONE` / `WEEKLY` / `MONTHLY`）・`recurrence_until`（終了日）・`series_id`（UUID、NULL 許容）を、Flyway の `V003` で追加する。既存の行は `recurrence_type = NONE`・他は NULL になり、影響を受けない | RSV-01（`series_id` は追加） |
| REC-02 | `POST /api/reservations` が `recurrenceType`（省略時 `NONE`）と `recurrenceUntil`（`yyyy-MM-dd`）を受け付け、繰り返しパターンに従って複数の予約を一括作成する | RSV-02 |
| REC-03 | 繰り返し日の生成規則に従う（下記「決定事項」の 6） | RSV-02 |
| REC-04 | 一括作成した予約は、それぞれ独立した予約として管理する。個別にキャンセル・変更ができ、既存の API・画面の挙動は変えない | RSV-03 |
| REC-05 | 一括作成では、1 件でも重複があれば全件を作らずに 409 `RESERVATION_CONFLICT` を返す。既存の予約との重複と、生成した予約どうしの重複（自己重複）の両方を対象とする | RSV-04 |
| REC-06 | `POST /api/reservations` のレスポンスは、`recurrenceType` にかかわらず常に配列（201）で返す。`NONE` のときは 1 件の配列になる | RSV-02（レスポンスの複数件返却） |
| REC-07 | 下書き保存（`draft: true`）と併用できる。全件を `DRAFT` で作り、同じ `series_id` を付ける | （ユーザー指定） |
| REC-08 | 承認が必要なリソースでは、全件を `PENDING` で作り、N 件分の承認ステップを作る | （ユーザー指定） |
| REC-09 | 繰り返し指定を検証する（下記「決定事項」の 7） | （ユーザー指定） |
| REC-10 | 予約の詳細 API（`GET /api/reservations/{id}`）が、シリーズの情報（`seriesId`・`recurrenceType`・`recurrenceUntil`・シリーズ件数・残り回数）を返す | （ユーザー指定） |
| REC-11 | 予約申請フォーム（`/reservations/new`）に繰り返しの入力 UI を追加する（「繰り返さない」「毎週」「毎月」と終了日）。登録に成功したら「N 件の予約を登録しました」とトーストで知らせる | RSV-05 |
| REC-12 | 予約の詳細画面に、シリーズ件数と残り回数を表示する。予約の一覧画面には表示しない | （ユーザー指定） |

## 決定事項（Requirements Analysis で確定）

| # | 論点 | 決定 |
|---|------|------|
| 1 | 繰り返しの種別 | `NONE` / `WEEKLY` / `MONTHLY` の 3 値。日次・曜日の複数指定・間隔指定（N 週ごと）はスコープ外 |
| 2 | 保存する列 | `series_id`・`recurrence_type`・`recurrence_until` の 3 列を、系列内のすべての予約に同じ値で保存する。`NONE` の予約は `series_id` と `recurrence_until` が NULL |
| 3 | 生成のタイミング | 作成時に全件を同期生成する。バッチによる遅延生成はしない |
| 4 | 件数と終了日の上限 | 件数の上限は設けない。ただし終了日は開始日から 2 年以内に限る（2 年後の同じ日までは有効。開始日が 2 月 29 日で 2 年後が平年なら 2 月 28 日まで）。超過は 400 `VALIDATION_ERROR`。当初は上限なしとしたが、PR #150 の AI レビュー（Should fix）で、極端に遠い終了日が大量の生成とロックの長時間保持を招くため、終了日の上限を追加した |
| 5 | 重複時の扱い | 1 件でも重複すれば全件ロールバックし、409 `RESERVATION_CONFLICT` を返す。メッセージは既存の固定文言のままで、衝突した日付は含めない。自己重複は既存予約との重複と同じ 409 で返す。下書きの繰り返しでも、自己重複は同じく 409 とする |
| 6 | 繰り返し日の生成規則 | 1 回目は入力の `startAt`・`endAt` そのもの。`WEEKLY` は 7 日ごと（同じ曜日・同じ時刻）。`MONTHLY` は 1 回目の日（day of month）を基準に毎月同じ日で、その月に存在しない日（31 日の 2 月など）はその月をスキップする。スキップした月の次は、直前の回からの積み上げではなく基準日から数える（1 月 31 日の次は 3 月 31 日）。`recurrenceUntil` の日付と同じ日に始まる回は含める（終了日当日を含む）。各回の長さは 1 回目の `endAt - startAt` と同じで、日をまたぐ予約も許可する |
| 7 | 繰り返し指定の検証 | すべて 400 `VALIDATION_ERROR`。(a) `NONE` で `recurrenceUntil` が指定された、(b) `WEEKLY` / `MONTHLY` で `recurrenceUntil` が未指定、(c) `recurrenceUntil` が `startAt` の日付より前。`recurrenceUntil` が `startAt` の日付と同じなら有効で、1 件だけ生成する。(c) は既存の `endAt > startAt` の検証（422）と HTTP ステータスが異なる |
| 8 | レスポンスの形 | 常に配列（`startAt` の昇順）。既存のフロント（`createReservationAction`）とテストは配列に追従させる |
| 9 | シリーズ件数 | 同じ `series_id` の予約の件数。キャンセル済み・却下済みを含む、全ステータスを数える（生成した件数と一致する） |
| 10 | 残り回数 | 表示中の予約より後（`startAt` がより遅い）の、同じ `series_id` の予約の件数。表示中の予約自身は含まず、閲覧する日で値は変わらない。件数の数え方は 9 と同じ（全ステータス） |
| 11 | シリーズ情報の取得方法 | 詳細 API だけがシリーズ件数・残り回数を計算して返す。一覧 API では計算せず（N+1 の回避）、`seriesId` などの保存列だけを返す。`series_id` が NULL の予約では、件数・残り回数は null |
| 12 | 一括操作 | シリーズの一括変更・一括キャンセルは、スコープ外 |

## 既定の前提（レビューで変更可）

質問せず、次の既定値を置く。承認時に違和感があれば Request Changes で指定する。

- **詳細画面の表示項目**：シリーズ件数と残り回数に加えて、繰り返しの種別（毎週 / 毎月）と終了日も表示する。`REC-12` の指定は件数と残り回数だが、種別と終了日は保存する列（REC-01）であり、一緒に出さないと件数の意味が伝わらないため
- **`NONE` の予約の表示**：詳細画面にシリーズの欄を出さない
- **ラベル**：`recurrenceType` の表示名は「繰り返さない」「毎週」「毎月」。`lib/labels.ts` に定数を追加する
- **`recurrenceUntil` の型と形式**：DB は日付型、API は `yyyy-MM-dd`。タイムゾーンは変換せず、`LocalDateTime` をそのまま使う（既存の API と同じ）
- **過去日時**：既存の予約作成と同じく、過去日時のチェックは追加しない
- **フォームの入力**：「繰り返さない」が初期値。「毎週」「毎月」を選ぶと終了日（`type="date"`）が現れ、必須になる。「繰り返さない」に戻すと終了日は非表示にして値を送らない（API の 400（a）を避けるため）
- **成功後の遷移**：トースト表示のあと、従来どおり `/reservations`（下書きは `/reservations?status=DRAFT`）へ遷移する

## 非機能要件

- **セキュリティ**：Security Baseline 拡張は適用しない。権限は既存の予約作成と同じ（認証済みユーザー全員が自分の予約を作れる）。追加の認可はない
- **性能とロック時間（リスク）**：件数の上限がないため、終了日の上限（2 年）までの毎週の繰り返しは、最大 105 件の予約を生成する。重複チェックはリソース行の悲観ロックを取ったまま、既存予約の読み込みと比較を行うので、件数が増えるほどロックの保持時間が伸びる（同じリソースへの他の予約・承認が待たされる）。終了日を開始日から 2 年以内に限る（決定事項 4。PR #150 の AI レビューで追加）ため、毎週で最大 105 件、ロックの保持時間もその件数が上限になる。設計では、既存予約の取得を 1 回にまとめ、メモリ上で全日程を比較する方式を検討する（1 日程ごとの再取得を避ける）
- **一貫性**：全件の作成は 1 つのトランザクションで行う。重複・承認者不在（422 `APPROVER_NOT_AVAILABLE`）などの例外は `RuntimeException` なので、全件がロールバックされる。保存した兄弟予約が次の重複判定に見えるかは Hibernate の自動フラッシュに依存するため、自己重複はメモリ上の比較で検出する方針とし、設計で確定する
- **互換性**：既存の予約の `recurrence_type` は `NONE`（既定値）で、既存データに影響しない。`POST /api/reservations` のレスポンスが単体から配列に変わる破壊的変更であり、フロント・MSW・既存のテストを同じ変更で更新する
- **DB**：本番は `ddl-auto: validate` のため、`Reservation` の `@Column` と V003 の列の名前・型・nullable を一致させる。テストは H2 の `create-drop` で Flyway が無効のため、V003 の SQL の誤りは自動テストで検知できない。PostgreSQL でのローカル起動による確認が必要
- **コード品質**：Checkstyle の `ParameterNumber`（最大 7）に注意する。`Reservation.create` は現在 7 引数で上限のため、列を足すには引数オブジェクトか別のファクトリが必要。Spotless（googleJavaFormat）に適合させる。テストの UUID プレフィックスは未使用の `40`・`50`・`80`・`90` から選ぶ
- **テスト容易性**：繰り返し日の生成は、副作用のない純粋関数に切り出してユニットテストする（月末スキップ、基準日からの数え方、終了日当日、日またぎ、自己重複）。Property-Based Testing は適用しない。Radix Select は jsdom で開けないため、フロントのテストでは既存どおり初期値で選択済みを再現する
- **OpenAPI**：レスポンスの配列化と追加項目が Springdoc のドキュメントに反映される

## 受入条件（シートと決定事項より）

- [ ] 「毎週」を選んで申請すると、開始日から終了日まで、毎週同じ曜日・時刻の予約が一括登録される（終了日当日の回を含む）
- [ ] 「毎月」を選んで申請すると、開始日から終了日まで毎月同じ日の予約が一括登録される。その月に存在しない日（例：31 日の 2 月）の月はスキップされる
- [ ] 一括登録された予約は予約一覧に個別に表示され、それぞれ詳細確認・キャンセルができる
- [ ] 繰り返し範囲内に重複する予約がある場合、全件が登録されず、409 `RESERVATION_CONFLICT` とエラーメッセージが表示される
- [ ] 生成した予約どうしが重なる場合（例：8 日間の予約の毎週の繰り返し）も、全件が登録されず 409 になる
- [ ] 「繰り返さない」（初期値）を選んだ場合は、従来どおり 1 件の予約として登録される（レスポンスは 1 件の配列）
- [ ] `NONE` で `recurrenceUntil` を指定、`WEEKLY` / `MONTHLY` で未指定、`recurrenceUntil` が開始日より前、のいずれも 400 `VALIDATION_ERROR` になり、予約は作られない
- [ ] 下書き保存と併用すると、全件が `DRAFT` で登録され、同じ `series_id` を持つ
- [ ] 承認が必要なリソースでは、全件が `PENDING` で登録され、件数分の承認ステップが作られる
- [ ] 日をまたぐ予約（例：23:00 から翌 2:00）の繰り返しが、各回とも同じ長さで登録される
- [ ] 繰り返しで作った予約の詳細画面に、種別・終了日・シリーズ件数・残り回数が表示される。一覧には表示されない
- [ ] 登録に成功すると、「N 件の予約を登録しました」とトーストが表示される
- [ ] Flyway マイグレーション `V003` が正常に実行され、既存データへの影響がない（PostgreSQL で確認）
- [ ] バックエンド・フロントエンドの既存テストが（配列化への追従後に）pass する
- [ ] 繰り返し日の生成ロジックに対応するユニットテストがある

## 影響範囲（RE 成果物に基づく変更予定ファイル）

仕様（Spec-first で先に更新）
- `docs-next/docs/spec/requirements.md`：`REC-01`〜`12`（UC-03 の拡張）
- `docs-next/docs/spec/api-spec.md`：`POST /api/reservations`（繰り返しパラメータ、配列のレスポンス）と `GET /api/reservations/{id}`（シリーズ情報）
- `docs-next/docs/spec/er-diagram.md`：`reservations` の 3 列
- `docs-next/docs/spec/screen-spec.md`：`/reservations/new` の繰り返し入力、予約詳細のシリーズ情報

バックエンド（`backend/src/main/java/com/example/bookflow/`）
- `src/main/resources/db/migration/V003__...sql`（新規）
- `domain/Reservation.java`（3 列の追加。`create` の引数の扱いを設計で決定）、`domain/ReservationRepository.java`（シリーズ件数・残り回数の取得）
- `presentation/dto/CreateReservationRequest.java`・`ReservationResponse.java`
- `presentation/ReservationController.java`（戻り値を配列に）、`application/ReservationService.java`（日付生成、全件の重複チェック、一括作成）
- テスト：`ReservationServiceTest`、`ReservationControllerTest`、繰り返し日の生成ロジックのテスト（新規）

フロントエンド（`frontend/src/`）
- `lib/schemas/reservation.ts`、`lib/types/api.ts`、`lib/types/enums.ts`、`lib/labels.ts`
- `server/actions/reservations.ts`（配列のレスポンス）、`app/(authenticated)/reservations/new/ReservationForm.tsx`
- `app/(authenticated)/reservations/[id]/` の詳細画面（シリーズ情報）
- テスト：`reservation-form.test.tsx`、`server/actions/reservations.test.ts`、詳細画面のテスト、`tests/unit/msw/handlers.ts`、E2E の予約フロー

## スコープ外

- 日次の繰り返し、曜日の複数指定、N 週ごとの間隔指定
- シリーズの一括変更・一括キャンセル・一括承認、シリーズの専用テーブル（`reservation_series`）
- 件数そのものの上限（終了日の上限は対象）と、過去日時の検証、`series_id` 以外の列へのインデックス追加
- 予約の一覧画面でのシリーズ情報の表示
- 重複した日付のエラーメッセージへの記載
