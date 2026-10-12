# Code Structure — csv-report（CSV 帳票出力）スコープ限定調査

> 本ファイルは Issue #29「CSV 帳票出力」（要件 RPT-01〜RPT-05）の実装に必要な範囲に限定した Reverse Engineering 成果物である。既存の `code-structure-*.md`（他ユニット向け）は変更しない。
> 調査はコード変更なしの読み取りのみ。サブエージェントの報告のうち、CSV ライブラリ不在・期間重複条件・`@PreAuthorize`・`ALL_STATUSES` は本体側で再確認済み。それ以外は報告に基づく。`【推測】` は未検証。

パス略記：`B/` = `backend/src/main/java/com/example/bookflow/`、`T/` = `backend/src/test/java/com/example/bookflow/`、`F/` = `frontend/src/`。

## 1. バックエンド

### 1.1 予約一覧 API の処理フロー

- `B/presentation/ReservationController.java:52-70`：`GET /api/reservations` の `list(...)`。`status`・`resourceName`・`from`・`to`・`@PageableDefault(size=20) Pageable`・`@CurrentUser User` を受ける。`from`/`to` は片方だけだと `ValidationException`（400）。
- `B/application/ReservationService.java:88-155`：`list(User, Collection<ReservationStatus>, String, from, to, Pageable)`。`@Transactional(readOnly=true)`。`getRole()==ADMIN` なら全件、それ以外は本人分のみ。条件の有無の組合せ（約 16 通り）を if/else で分岐し、専用 Repository メソッドを呼ぶ。最後に `page.map(ReservationResponse::from)`。
- `B/domain/ReservationRepository.java`：Specification は使わず、JPQL `@Query` を組合せごとに個別定義（例 `findAllFetch` :93-96、`findByResourceNameAndPeriodAndStatusInFetch` :199-218）。いずれも `JOIN FETCH r.resource JOIN FETCH r.requester` と別 countQuery を持つ。
- `B/presentation/dto/ReservationResponse.java`：record。`id, resourceId, resourceName, requesterId, requesterName, startAt, endAt, purpose, attendeesCount, status(String), createdAt, updatedAt`。
- 予約について、ページングなしで全件（または条件付き全件）を返す `List` 系 Repository メソッドは存在しない（確認済み：不在）。

### 1.2 from / to / status の受け渡し

- `status`：`List<ReservationStatus>`（複数可）。不正値は 400（`GlobalExceptionHandler.java:99-103`）。
- `from`/`to`：`LocalDateTime`（`@DateTimeFormat` なし、ISO デフォルト。例 `2025-06-01T00:00:00`、`api-spec.md:494`）。
- 意味：開始日時の範囲ではなく**期間重複判定**。`PERIOD_MATCH = "r.startAt < :to AND r.endAt > :from"`（`ReservationRepository.java:132`、確認済み）。境界一致の隣接は含まない（`api-spec.md:513`）。
- フロントは `datetime-local`（16 文字）を `toIsoWithSeconds`（19 文字）に変換して送る（`F/server/actions/reservations.ts:29-32`）。

### 1.3 ADMIN 権限制御

- `SecurityConfig.java:23-63`：`@EnableMethodSecurity`。`requestMatchers` は permitAll 4 件のみで `anyRequest().authenticated()`。ロール別制御はすべて `@PreAuthorize`（`UserController.java:45`、`ResourceController.java:110,134,148`、承認系は `hasAnyRole('APPROVER','ADMIN')`）。
- `RoleJwtAuthenticationConverter.java:80-90`：JWT `custom:role` を `ROLE_<role>` に変換。
- `RegisteredUserInterceptor`（`/api/**`）が JWT sub を users テーブルと照合し、未登録は 401。
- 403 応答：`RestAccessDeniedHandler` と `GlobalExceptionHandler.handleAccessDenied`（`{code:"FORBIDDEN", message}`）。
- 既存の ADMIN 専用例：`GET /api/users`。新規 `/api/reports/**` は Controller に `@PreAuthorize("hasRole('ADMIN')")` を付けるのが既存流儀。

### 1.4 CSV 出力の既存実装・ライブラリ

- `text/csv`・`StreamingResponseBody`・`Content-Disposition`・`opencsv`・`commons-csv` はバックエンド・フロントエンドとも**ヒットなし**（確認済み）。再利用できる実装はない。
- `build.gradle.kts`：Spring Boot 4.0.6 の BOM + 非 BOM 依存は `"group:artifact:version"` 直書き（springdoc 3.0.1 等、ADR 番号コメント付き）。バージョンカタログなし。CSV ライブラリを足す場合も同形式（ADR の追加が妥当）。

### 1.5 データ取得上の注意

- `Reservation`：`resource`・`requester` は `@ManyToOne LAZY`、`spring.jpa.open-in-view: false`。CSV 用クエリも `JOIN FETCH` が必須（さもなくば LazyInitializationException）。
- ステータス enum は `DRAFT, PENDING, APPROVED, REJECTED, CANCELLED`。日本語ラベルはバックエンドに無く、`F/lib/labels.ts:22-26`（下書き／承認待ち／承認済み／却下／キャンセル済み）にのみある。CSV 用に Java 側へ対応表を持つ必要がある。
- `start_at`/`end_at` のインデックスは無い（`V001:75-77`）。大量データ時の懸念【推測】。
- Checkstyle：`ParameterNumber` 最大 7、`NeedBraces`、`ConstantName`（UPPER_SNAKE_CASE）など。条件は record（例 `ReportCondition`）にまとめるのが安全。Spotless は googleJavaFormat 1.28.0。

### 1.6 既存テストの様式

- Controller：`T/support/BaseControllerTest`（`@SpringBootTest` + MockMvc + H2）、`@WithMockAdmin/Approver/Member`、JdbcTemplate で固定 UUID を seed し `@AfterEach` で削除。403 の雛形は `T/presentation/UserControllerTest.java`、予約 seed は `ReservationControllerTest.java`。users 行を seed しないと 401 になる。
- Service：`T/application/ReservationServiceTest.java`（Mockito、`@Nested`、命名 `methodName_condition_expectedBehavior`）。
- CSV 応答（BOM・Content-Type・Content-Disposition）の検証の先例はない。

## 2. フロントエンド

- 管理者専用の予約一覧は**存在しない**。`/admin` は `resources` と `users` のみ。最も近いのは `F/app/(authenticated)/reservations/page.tsx`（ADMIN なら全件・見出し「全予約一覧」、:77,83）。
- `admin/layout.tsx:10-30` が ADMIN ガード。`/reservations` は `/admin` 配下ではないためこのガードは効かず、ボタンは `isAdmin`（:77）で出し分ける必要がある。
- ボタン配置候補：`reservations/page.tsx:80-89` のヘッダ行（「リソースを探す」の隣）。フィルタ状態は URL searchParams（`status`・`resourceName`・`from`・`to`・`page`、:54-60）で、`ReservationFilterForm.tsx:31-56` が `router.push` で更新する。
- `status` 未指定時は DRAFT を除外（`ALL_STATUSES`、:47,62-64）。CSV の既定をこれに揃えるか要判断。
- API 呼び出し：`F/lib/api-client.ts` の `createApiClient(getToken)`。サーバー側は `BACKEND_URL` 絶対 URL、ブラウザ側は `/api/backend/*` rewrite。公開メソッドは `get/getPaginated/getArray/post/put/patch/postEmpty`、すべて `res.json()` 前提。Accept/Content-Type は JSON 固定、`request()` は非公開。テキスト・バイナリ取得メソッドは無い。
- Route Handler は `app/api/auth/[...all]/route.ts`（Better Auth）のみ。ダウンロード実装（Blob・`a[download]`・`createObjectURL`）は**皆無**。
- ADMIN 判定の共通ヘルパーは無く、各所で `profile.role === "ADMIN"` をインライン記述。
- テスト：Server Action は `tests/unit/server/actions/reservations.test.ts`（MSW、`next/headers`・`@/lib/session` を mock）、ページは `tests/unit/reservations-page.test.tsx`、Client は `tests/unit/reservation-filter-form.test.tsx`。MSW ハンドラは `tests/unit/msw/handlers.ts`（予約系 :190-231）。`onUnhandledRequest:"error"`。

## 3. 仕様側の現状

- `docs-next/docs/spec/api-spec.md` に帳票出力セクション無し。`requirements.md:57` に「CSV / PDF 帳票出力」の言及のみで、RPT-01〜05 の本文はビジネス要求シート（`enhancements/intermediate/csv-export.md`）にのみある。Spec-first のため `/update-spec` での追記が実装より先。
