# Code Structure — recurring-reservation（繰り返し予約）スコープ限定調査

> 本ファイルは Issue #31「繰り返し予約」の実装に必要な範囲に限定した Reverse Engineering 成果物である。既存の `code-structure-*.md`（他ユニット向け）は変更しない。
> 調査はコード変更なしの読み取りのみ。`backend/` と `frontend/` の調査はサブエージェントの報告に基づき、次の 4 点は本体側で再確認済み：(1) 最新のマイグレーションは `V002`（新規は `V003` 以降）、(2) `requirements.md` の `RSV-01`〜`07` が既存で、シートの `RSV-01`〜`05` と ID が衝突する、(3) `ReservationService` はクラス単位の `@Transactional`、(4) `Reservation.create` の引数がちょうど 7 個で Checkstyle の `ParameterNumber`（最大 7）に達している。`【推測】` は未検証。

パス略記：`B/` = `backend/src/main/java/com/example/bookflow/`、`T/` = `backend/src/test/java/com/example/bookflow/`、`F/` = `frontend/src/`。

## 1. バックエンド

### 1.1 予約作成の流れ

- `B/presentation/ReservationController.java`：`POST /api/reservations`（`@Valid @RequestBody CreateReservationRequest`、201）→ `ReservationService.create`。戻りは `ReservationResponse` 単体
- `B/application/ReservationService.java:219-264` の `create`（クラス単位の `@Transactional`、1 トランザクション）：(1) `resourceRepository.findByIdForUpdate`（リソース行への悲観ロック）→ (2) `endAt > startAt` の検証（違反は 422）→ (3) `checkConflict` → (4) status 決定（`draft` なら `DRAFT`、それ以外は `requiresApproval` で `PENDING`/`APPROVED`）→ (5) `Reservation.create` と `save` → (6) `PENDING` のときだけ `approvalService.createInitialStep`
- `Reservation.create` は 7 引数（`resource, requester, startAt, endAt, purpose, attendeesCount, status`）。id はアプリ側で `UUID.randomUUID()`。繰り返しの列を足すと `ParameterNumber` の上限を超えるため、別のファクトリ・引数オブジェクト・`setter` 的なメソッドが必要
- ロックは `ResourceRepository.findByIdForUpdate`（`@Lock(PESSIMISTIC_WRITE)`）をリソース行に対して取る方式で、`create`・`update`・`ApprovalService.approve` で重複チェックの前に取得する。`Reservation` 側にはロックも DB 制約もない

### 1.2 重複チェック

- `checkConflict`（`ReservationService.java:409-421`、private）：`findByResource_IdAndStatusIn(resourceId, OCCUPIED_STATUSES)` で取得し、Java 側で `excludeId` を除いて `ResourceService.overlaps` を判定する。対象は `PENDING`/`APPROVED`。`DRAFT`・`REJECTED`・`CANCELLED` は無視。重複は 409 `RESERVATION_CONFLICT`
- `ResourceService.overlaps` は `public static`、半開区間 `[start, end)`、境界一致は非重複。予約・承認・リソースの 3 サービスが共用
- 【推測】同一トランザクション内でのリソース行の再ロックは再入可能で、先頭で 1 回取れば足りる。`save` 後の次の `checkConflict`（派生クエリ）が保存済みの兄弟予約を見えるかは Hibernate の auto flush に依存する。Mockito の単体テストでは見えない
- 例外は `RuntimeException`（`ReservationConflictException`・`BusinessException`）のため、クラスの `@Transactional` で全件ロールバックがそのまま効く

### 1.3 承認フローとの関係

- `ApprovalService.createInitialStep`：`findFirstByRole(APPROVER)` の先頭 1 名を承認者に選び、`step_order = 1` のステップを 1 件作る（1 予約 1 ステップ）。承認者がいなければ 422 `APPROVER_NOT_AVAILABLE`
- `PENDING` で N 件を一括作成すると、承認ステップも N 件になり、承認画面には N 件が個別に並ぶ。承認・却下は 1 件ずつで、まとめて承認する API はない
- 承認時は所有権・決済済み・`PENDING` のガード、リソースの悲観ロック、`checkConflictExcludingSelf`（`PENDING`/`APPROVED` の自分以外）による再チェックが走る。生成時に兄弟どうしの非重複を保証していれば、承認で兄弟と競合しない

### 1.4 バリデーション

- `CreateReservationRequest`：`resourceId`・`startAt`・`endAt` が `@NotNull`、`purpose` が `@NotBlank` かつ最大 255、`attendeesCount` が `@Positive`（null 可）、`draft` は `Boolean`。違反は 400 `VALIDATION_ERROR`。日時整合性は Service で 422 `VALIDATION_ERROR`
- **過去日時のチェックはない**（確認済み）。繰り返し用の `recurrenceType`・`recurrenceUntil` は未実装。繰り返しの上限件数・終了日の検証方針は spec にない

### 1.5 DB スキーマ

- `reservations`（V001）：id・resource_id・requester_id・start_at・end_at・purpose・attendees_count・status・created_at・updated_at。`chk_reservations_status`、`chk_reservations_time`（`end_at > start_at`）、`resource_id`・`requester_id`・`status` のインデックス。繰り返しの列はない
- 最新は **V002**（`ALTER TABLE ... ADD COLUMN` で `resources` に NULL 許容の列を追加。H2・PostgreSQL 両対応の前例）。シートの「現状は V001 のみ」は古く、新規は **V003** 以降
- 本番は `ddl-auto: validate` のため、`Reservation` の `@Column` と DB 列の名前・型・長さ・nullable を一致させる必要がある
- **テストは H2 の `create-drop` で Flyway が無効**（`application-test.yml`）。マイグレーション SQL の誤りは自動テストでは検知できず、PostgreSQL でのローカル起動での確認が必要

### 1.6 テスト・規約

- 雛形：`T/application/ReservationServiceTest.java`（Mockito、`@Nested`、`@BeforeEach` の `lenient()` スタブ、リフレクションで組み立て）、`T/presentation/ReservationControllerTest.java`（`BaseControllerTest`）
- UUID プレフィックスの使用済み：`00`・`10`・`20`・`30`・`60`・`61`・`70`・`71`・`72`・`73`（テストコード上。seed 側は未確認）。`40`・`50`・`80`・`90` が未使用
- Checkstyle：`ParameterNumber` 最大 7、`MethodLength` 最大 150。Spotless：googleJavaFormat 1.28.0

## 2. フロントエンド

- `F/app/(authenticated)/reservations/new/page.tsx`（Server Component）が `searchParams` の `resourceId`・`startAt` と、`listResourcesAction({size:100})` の結果を `ReservationForm` に渡す
- `ReservationForm.tsx`（Client）：React Hook Form と `zodResolver(FormSchema)`、`FormSchema = CreateReservationSchema.refine(endAt > startAt)`。送信は `submitForm(draft)` で、成功時は `/reservations`（下書きは `/reservations?status=DRAFT`）へ遷移。`ApiClientError` の `RESERVATION_CONFLICT` は固定文言を表示し、それ以外は再 throw（エラーバウンダリ）。日時は `<Input type="datetime-local">`
- `server/actions/reservations.ts` の `createReservationAction` は `client.post("/reservations", body, ReservationResponseSchema)` で単一の `ReservationResponse` を返す。**複数件を返す POST の既存パターンはない**（`getArray` は GET 用）。【推測】`client.post(path, body, ReservationResponseSchema.array())` で api-client を変えずに配列を受けられる
- UI 部品：`components/ui/` に select（Radix）・input・form・button などがあり、繰り返し種別は Select、終了日は `Input type="date"` で足りる。checkbox・radio の部品はない（必要なら新規追加）。間隔・回数は `Input type="number"`（`attendeesCount` が前例）
- バリデーション：Zod の `CreateReservationSchema`（`draft` は optional）。`refine` は `"use server"` ファイルから export できないためコンポーネント側で付ける。`lib/schemas/reservation.ts` のコメントは「Server Action 側でも検証」と書くが、実際にはクライアントのみ
- 日時の秒補完は `server/actions/reservations.ts` の `toIsoWithSeconds`（非公開）。`lib/datetime.ts` に共通版がある（直前ユニットで追加）
- テスト：`reservation-form.test.tsx`、`reservation-new-page.test.tsx`、`server/actions/reservations.test.ts`、`tests/unit/msw/handlers.ts`（POST は単一オブジェクトを 201 で返す）。**Radix Select は jsdom で開けない**（`hasPointerCapture` 未実装）ため、既存テストは初期値で選択済みを再現している。繰り返し種別の Select も同じ制約を受ける
- 一覧・詳細：`ReservationResponse`（`lib/types/api.ts`）に繰り返し系のフィールドはない。追加するなら `.nullable().optional()` が後方互換。一覧の空行の `colSpan` は列を足すと更新が必要。個別キャンセルは `CancelButton`・`cancelReservationAction` が 1 件単位

## 3. 仕様側の現状と乖離

- `api-spec.md` §`POST /api/reservations` に繰り返しの記載はない（レスポンスは単体 JSON の 201）。`er-diagram.md` の `reservations` は V001 の 10 列のまま
- **要件 ID の衝突**：シートの `RSV-01`〜`05` は `requirements.md` の既存 `RSV-01`〜`07`（一覧・詳細・キャンセル・編集）と衝突する。新しい接頭辞（例：`REC-`）の採番が必要
- **競合する課題**：`reservation-draft`（#30）はマージ済みで、`POST /api/reservations`・`/reservations/new` はすでに `draft` に対応している。`draft` と繰り返しの併用は spec 未定義
- シートは次を定めていない：繰り返しの上限件数、終了日の検証（開始日以前の終了日・過去）、「毎月同日」の月末（31 日）の扱い、`draft` との併用、重複時のエラーにどの日が衝突したかを含めるか、レスポンスの形（単体から複数件への変更の互換）、承認が必要なリソースでの扱い（承認ステップ N 件）、「個別にキャンセル・変更」以外の系列操作（一括キャンセル）の要否
