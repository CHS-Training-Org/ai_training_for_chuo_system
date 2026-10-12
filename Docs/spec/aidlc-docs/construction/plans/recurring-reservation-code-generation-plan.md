# Code Generation Plan — ユニット: recurring-reservation（繰り返し予約）

> この計画が Code Generation の唯一の正（single source of truth）。生成中はステップ順を変えず、完了したステップを直ちに [x] にする。

## Unit Context

- **Stories implemented**: US-01〜US-08（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（前提課題なし。直前ユニットの #28・#29・#30 はマージ済みで、下書き保存（#30）の `draft` と `update` の `submit` を本ユニットが拡張・併用する）
- **Database entities owned**: `reservations`（V003 で 3 列・CHECK 制約 2 つ・インデックス 1 つを追加）
- **Service boundaries**: backend は `domain/RecurrenceType`（新規）、`application/RecurrenceSchedule`（新規）、`domain/Reservation`・`domain/ReservationRepository`・`application/ReservationService`・`presentation/ReservationController`・`presentation/dto/CreateReservationRequest`・`ReservationResponse` の変更。frontend は `lib/` の型・ラベル・スキーマ、`server/actions/reservations.ts`、`reservations/new/ReservationForm.tsx`、`reservations/[id]/page.tsx` の変更。`ApprovalService`・`ResourceService` は変更せず再利用する

## 技術判断の参照先

Functional Design（`Docs/spec/aidlc-docs/construction/recurring-reservation/functional-design/`）で確定済みの内容をそのまま実装する。本計画では再掲せず参照にとどめる。

- `business-logic-model.md`：日付生成のアルゴリズム、一括作成の 10 手順、重複判定の方針、詳細のシリーズ件数、設計上の判断、リスク
- `business-rules.md`：BR-01〜BR-31 と、ストーリー・テストの対応表
- `domain-entities.md`：V003 の列・CHECK・インデックス、`RecurrenceType`、`Reservation` の追加、DTO の項目、Repository の追加クエリ
- `frontend-components.md`：スキーマ・フォーム・Server Action・詳細画面の仕様とテスト一覧

## 実行上の制約

- **テスト・ビルドは省メモリ・直列で実行する**（`./gradlew ... --max-workers=1`、`pnpm test` は `vitest.config.ts` の `maxForks: 1` に従う、`pnpm build` は `NODE_OPTIONS=--max-old-space-size=1536`）。複数のビルド・テストを同時に走らせない（メモリ枯渇の再発防止）
- 新規ファイルのみ追加し、既存ファイルは in-place で最小変更する（`*_new` 等の複製を作らない）
- UI 要素には安定した `data-testid` を付ける。既存の `reservation-form-submit-button`・`reservation-form-draft-button` は変えない。追加する値は `reservation-form-recurrence-type`（種別の Select）、`reservation-form-recurrence-until`（終了日の入力）
- 依存関係の追加なし。このため ADR は追加しない
- backend のテストの UUID プレフィックスは `40` を使う（テストコード上で未使用。Step 6 の着手時に `src/main/resources` の seed と `src/test` を検索し、衝突がなければ `40`、あれば `50` を使う）
- 破壊的変更（`POST /api/reservations` のレスポンスの配列化）は、backend と frontend の既存テスト・fixtures を同じ変更の中で追従させる。追従したテストの一覧は、各ステップに記載する
- Checkstyle の `ParameterNumber`（最大 7）を守る。`Reservation.create` の署名は変えない
- V003 は H2 のテストで実行されない。SQL の構文は、H2・PostgreSQL の双方で通る前例（V002）の書き方に揃え、PostgreSQL での実行確認は Build and Test の手動確認に回す
- 実装を一時的に壊してテストが失敗することを確かめる確認（break-and-verify）を、backend と frontend の主要な規則で行い、確認後に必ず復元する

## 実行ステップ

- [x] **Step 1: 仕様書更新（Spec-first、実装より先）**
  - `/update-spec` の手順に従い、`.claude/skills/update-spec/references/spec-conventions.md` を読んでから更新する
  - `docs-next/docs/spec/requirements.md`：§予約に、`REC-01`〜`12`（UC-03 の拡張）を追加する。要件の定義は `Docs/spec/aidlc-docs/inception/requirements/requirements.md` の機能要件と決定事項に従う。重複予約チェック仕様の節に、繰り返し予約の全件判定（自己重複を含む）を追記する。スコープ表の「繰り返し予約（毎週・毎月）の追加」の扱いを確認し、必要なら同期する
  - `docs-next/docs/spec/api-spec.md`：`POST /api/reservations` に `recurrenceType`・`recurrenceUntil`、配列のレスポンス（201）、400 の 3 パターン、409 の自己重複を追記する。`GET /api/reservations/{id}` に `seriesId`・`recurrenceType`・`recurrenceUntil`・`seriesCount`・`remainingCount` を追記する。予約レスポンスの共通項目（12 項目）の説明を 17 項目に更新する
  - `docs-next/docs/spec/er-diagram.md`：§`reservations` に 3 列と、2 つの CHECK 制約、`idx_reservations_series_id` を追記する
  - `docs-next/docs/spec/screen-spec.md`：§`/reservations/new` に繰り返しの Select・終了日・トースト・検証メッセージを、§`/reservations/{id}` にシリーズ情報の表示（種別・終了日・シリーズ件数・残り回数、`NONE` では非表示）を追記する。画面一覧の説明文を必要に応じて同期する
  - ビジネス要求シート（`enhancements/intermediate/recurring-reservation.md`）は変更しない（学習者向けの課題文であり、真実の源は `requirements.md` 側）
  - 各ファイルの frontmatter の `last_updated` を更新する。`cd docs-next && NODE_OPTIONS=--max-old-space-size=2048 npm run build` でリンク・アンカーを確認する
  - Story mapping: US-01〜US-08

- [x] **Step 2: Backend ドメイン（マイグレーション・enum・エンティティ・Repository）**
  - 新規：`backend/src/main/resources/db/migration/V003__add_reservation_recurrence.sql`（3 列、`chk_reservations_recurrence_type`、`chk_reservations_series`、`idx_reservations_series_id`。V002 の書き方に揃える）
  - 新規：`backend/src/main/java/com/example/bookflow/domain/RecurrenceType.java`
  - 変更：`domain/Reservation.java`（3 フィールド、`joinSeries`、3 つの getter。`create` は署名を変えず、`recurrenceType = NONE` で初期化する）
  - 変更：`domain/ReservationRepository.java`（`countBySeriesId`・`countBySeriesIdAndStartAtAfter` を、「カテゴリ 5（予約一覧）」の節か末尾の新しい節に追加）
  - Story mapping: US-01, US-02, US-04, US-08

- [x] **Step 3: Backend 日付生成（`RecurrenceSchedule`）とそのユニットテスト**
  - 新規：`application/RecurrenceSchedule.java`（`startDates`。`business-logic-model.md` の「繰り返し日の生成」に従う）
  - 新規：`backend/src/test/java/com/example/bookflow/application/RecurrenceScheduleTest.java`（`business-rules.md` の対応表の BR-07〜BR-11：毎週の件数と終了日当日、終了日の前日、毎月の同日、1 月 31 日から 5 月 31 日のスキップ、スキップ後の基準日、28 日以前はスキップなし、終了日が開始日と同じ日、`NONE`、時刻の保持、年またぎ、うるう年の 2 月 29 日）
  - Story mapping: US-01, US-02

- [x] **Step 4: Backend DTO と、既存テストのコンパイル追従**
  - 変更：`presentation/dto/CreateReservationRequest.java`（`recurrenceType`・`recurrenceUntil` を末尾に追加、`recurrence()` を追加）
  - 変更：`presentation/dto/ReservationResponse.java`（5 項目を追加、`from(r)`、`from(r, seriesCount, remainingCount)`）
  - 変更：`backend/src/test/java/com/example/bookflow/application/ReservationServiceTest.java`（`new CreateReservationRequest(` の 8 箇所に、末尾の 2 引数（`null`・`null`）を足す）。`new ReservationResponse(` の 1 箇所（所在を検索で特定して更新する）
  - Story mapping: US-01, US-04, US-08

- [x] **Step 5: Backend `ReservationService` と、そのユニットテスト**
  - 変更：`application/ReservationService.java`（`create` を `List<ReservationResponse>` に。検証、日程の生成、自己重複、既存との重複（取得 1 回）、ステータス、作成と `joinSeries`、承認ステップ、を private メソッドに切り出す。`get` にシリーズ件数と残り回数。`update`・`checkConflict` は変更しない。クラスの Javadoc の業務ルールに、繰り返しを追記する）
  - 変更：`ReservationServiceTest.java`（既存の create 系のテストを、戻り値が `List` になる形に追従。`@Nested` に繰り返しのケースを追加：BR-02〜BR-05 の 3 つの 400 とロックを取らないこと、毎週・毎月の件数と `joinSeries` の値、日をまたぐ予約の長さ、既存との重複で 409 かつ `save` されない、自己重複（8 日間の毎週）、下書きの自己重複、隣接は重複でない、既存予約の取得が 1 回、全件 `DRAFT`・`PENDING`（承認ステップ N 回）・`APPROVED`、承認者なしで 422、詳細のシリーズ件数と残り回数（最後の回は 0）、`NONE` の詳細は null）
  - Story mapping: US-01, US-02, US-03, US-04, US-05, US-08

- [x] **Step 6: Backend `ReservationController` と結合テスト**
  - 変更：`presentation/ReservationController.java`（`create` の戻り値を `List<ReservationResponse>` に。Javadoc を更新）
  - 変更：`backend/src/test/java/com/example/bookflow/presentation/ReservationControllerTest.java`（既存の作成系 5 件（`post("/api/reservations")`）を配列のレスポンスに追従。繰り返しのケースを追加：UUID の先頭は `40`。毎週・毎月の件数と昇順、全件が同じ `seriesId`・種別・終了日、`NONE` は `seriesId` が null、既存の予約と 1 回だけ重なる繰り返しで 409 かつ 1 件も作られない、自己重複で 409、400 の 3 パターンと定義外の種別、`DRAFT` の繰り返し、承認要リソースの承認ステップの件数、1 件だけキャンセル・変更・`submit` して他の回が変わらない、詳細 API の 5 項目、一覧 API は `seriesCount`・`remainingCount` が null、レスポンスが 17 項目）
  - OpenAPI：`GET /v3/api-docs` に、配列のレスポンスと新しい項目が反映されることを、取得できれば同じテストクラスで検証する（取得できない設定のときは Build and Test の手動確認に回し、その旨を summary に記録する）
  - Story mapping: US-01, US-02, US-03, US-04, US-05, US-06, US-08

- [x] **Step 7: Backend 検証とサマリ**
  - `cd backend && ./gradlew spotlessApply checkstyleMain test --max-workers=1` が成功することを確認する
  - break-and-verify：自己重複の検出を外す、既存予約との重複判定を外す、月次を基準日からの数え直しでなく積み上げにする、`joinSeries` を呼ばない、検証をロックの後ろに移す、のうち主要なものを壊して該当テストが失敗することを確認し、復元する
  - 変更点を `Docs/spec/aidlc-docs/construction/recurring-reservation/code/backend-summary.md` に記録する（V003 が自動テストで実行されないことと、PostgreSQL での確認が必要なことを明記する）

- [x] **Step 8: Frontend 型・ラベル・スキーマ・Server Action とテスト**
  - 変更：`frontend/src/lib/types/enums.ts`（`RecurrenceTypeSchema`・`RecurrenceType`）、`lib/types/api.ts`（`ReservationResponseSchema` に 5 項目を `nullish()` / `optional()` で追加）、`lib/labels.ts`（`RECURRENCE_TYPE_LABELS`）
  - 変更：`lib/schemas/reservation.ts`（`CreateReservationSchema` に 2 項目、`CreateReservationFormSchema`（`.refine` 2 つと、移した `endAt > startAt`）を export。`lib/schemas/reservation.ts` 冒頭の「Server Action 側でも検証」という記述を、実態（クライアントのみ）に直す）
  - 変更：`server/actions/reservations.ts`（`createReservationAction` の戻り値を配列に。`zod` の import を追加）
  - 変更：`frontend/tests/unit/msw/handlers.ts`（`POST /reservations` が 1 件の配列を 201 で返す）、`tests/unit/server/actions/reservations.test.ts`（create を配列に追従し、複数件と 409 を維持）
  - 新規：`tests/unit/reservation-form-schema.test.ts`（`CreateReservationFormSchema` の `safeParse`：終了日の必須、開始日より前、`NONE` での不要、`endAt > startAt`、開始日時が空のときの扱い）
  - Story mapping: US-04, US-07

- [x] **Step 9: Frontend `ReservationForm` とテスト**
  - 変更：`reservations/new/ReservationForm.tsx`（「繰り返し」Select、条件付きの終了日、`CreateReservationFormSchema` の利用、送信時の `recurrenceUntil` の扱い、`toast.success`、既存の 409 と遷移の維持。`data-testid` を付ける）
  - 変更：`frontend/tests/unit/reservation-form.test.tsx`（`createReservationAction` のモックの戻り値を配列に。追加：初期値が「繰り返さない」で終了日が非表示、「毎週」を選ぶと終了日が現れる（polyfill で Select を操作。不安定なら省略可能な `defaultRecurrenceType` の props に切り替え、どちらを採ったかを summary に記録）、終了日未入力・開始日より前で送信されない、「繰り返さない」で `recurrenceUntil` が送られない、成功で件数付きの `toast.success` と遷移、下書きで `?status=DRAFT`、409 の固定文言と入力の保持）。`reservation-new-page.test.tsx` への影響を確認して追従する
  - Story mapping: US-03, US-04, US-05, US-07

- [x] **Step 10: Frontend 詳細画面とテスト**
  - 変更：`reservations/[id]/page.tsx`（シリーズ情報の 4 組、`NONE`・旧形式で非表示）
  - 変更：`frontend/tests/unit/reservation-detail-page.test.tsx`（種別・終了日・シリーズ件数・残り回数の表示、`NONE` で欄が出ない、`seriesCount` が null のとき件数の行が出ない）。一覧（`reservations-page.test.tsx`）にシリーズ情報が出ないことの確認を足す
  - Story mapping: US-06, US-08

- [x] **Step 11: Frontend 検証とサマリ**
  - `cd frontend && pnpm lint && pnpm format:check && pnpm test && NODE_OPTIONS=--max-old-space-size=1536 pnpm build` がすべて成功することを確認する（`pnpm format` で整形が必要なら適用）
  - break-and-verify：終了日の必須検証、「繰り返さない」での `recurrenceUntil` の除外、トーストの件数、`NONE` での詳細の非表示、のうち主要なものを壊して該当テストが失敗することを確認し、復元する
  - 変更点を `Docs/spec/aidlc-docs/construction/recurring-reservation/code/frontend-summary.md` に記録する

- [x] **Step 12: ストーリー対応の最終確認**
  - US-01〜US-08 の各 Scenario が、いずれかのテストで検証されていることを対応表（`business-rules.md`）と照合する。足りないテストは追加する
  - 重複ファイル（`*_new`・`*_modified` 等）がないこと、`git status` の差分が計画に列挙したファイルに収まることを確認する
  - 自動テストで検証できない確認事項（V003 の PostgreSQL での実行、CHECK 制約、`ddl-auto: validate` での起動、ロック下の一括作成、ブラウザでの手動確認）を一覧にして、Build and Test に引き継ぐ

## ストーリー進捗

- [x] US-01 毎週の繰り返し登録（Step 1・2・3・4・5・6）
- [x] US-02 毎月の繰り返し登録（Step 1・2・3・5・6）
- [x] US-03 重複時の全件失敗（Step 1・5・6・9）
- [x] US-04 繰り返し指定の検証と従来互換（Step 1・2・4・5・6・8・9）
- [x] US-05 下書き・承認が必要なリソースとの併用（Step 1・5・6・9）
- [x] US-06 個別の予約としての管理（Step 1・6・10）
- [x] US-07 フォームでの繰り返し入力と登録結果（Step 1・8・9）
- [x] US-08 詳細画面のシリーズ情報（Step 1・2・4・5・6・10）

## 変更ファイル一覧（予定）

- **Created（backend）**: `V003__add_reservation_recurrence.sql`、`domain/RecurrenceType.java`、`application/RecurrenceSchedule.java`、`RecurrenceScheduleTest.java`
- **Modified（backend）**: `domain/Reservation.java`、`domain/ReservationRepository.java`、`application/ReservationService.java`、`presentation/ReservationController.java`、`presentation/dto/CreateReservationRequest.java`、`presentation/dto/ReservationResponse.java`、`ReservationServiceTest.java`、`ReservationControllerTest.java`
- **Created（frontend）**: `tests/unit/reservation-form-schema.test.ts`
- **Modified（frontend）**: `lib/types/enums.ts`、`lib/types/api.ts`、`lib/labels.ts`、`lib/schemas/reservation.ts`、`server/actions/reservations.ts`、`reservations/new/ReservationForm.tsx`、`reservations/[id]/page.tsx`、`tests/unit/msw/handlers.ts`、`tests/unit/server/actions/reservations.test.ts`、`tests/unit/reservation-form.test.tsx`、`tests/unit/reservation-detail-page.test.tsx`（`reservation-new-page.test.tsx`・`reservations-page.test.tsx` は影響の確認結果に応じて追従）
- **Modified（docs）**: `requirements.md`、`api-spec.md`、`er-diagram.md`、`screen-spec.md`（件数表記の同期で `index.md` などに及ぶ場合は追記）
- **Created（AI-DLC 文書）**: `construction/recurring-reservation/code/backend-summary.md`、`frontend-summary.md`
