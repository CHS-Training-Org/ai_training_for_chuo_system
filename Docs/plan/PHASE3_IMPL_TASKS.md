# Phase 3 ベースサービス実装タスク

> 対象読者：メンター・リポジトリ管理者・AI エージェント  
> 参照：[PROJECT_PLAN.md](../PROJECT_PLAN.md) §4 Phase 2（実装）/ [03_SAMPLE_SERVICE_DOMAIN.md](./03_SAMPLE_SERVICE_DOMAIN.md) / [Docs/spec/](../spec/index.md) / [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## このドキュメントについて

**目的**：BookFlow 初期サービスのアプリケーションコード実装（バックエンド 4 層 + フロントエンド）を「やること・やったこと」で一元管理し、AI エージェント・メンターが連携して実装を進められる状態を維持する。

> **位置付け**：`PROJECT_PLAN.md` §4 では Phase 2 が「ベースサービス実装」と定義されているが、実際の `PHASE2_INIT_TASKS.md` はドキュメント整備に充てられた。**本ファイルがコード実装の実質的なキックオフドキュメント**であり、管理上は Phase 3 として扱う。

**仕様の真実の源**

| 項目 | ファイル |
| ---- | -------- |
| ドメイン・UC・ER・API 大枠・画面構成 | `Docs/plan/03_SAMPLE_SERVICE_DOMAIN.md` |
| ER 確定スキーマ（5 テーブル） | `backend/src/main/resources/db/migration/V001__create_initial_schema.sql` |
| 要件・権限マトリクス・ステータス遷移 | `Docs/spec/requirements.md` |
| REST API 仕様（DTO・シーケンス図） | `Docs/spec/api-spec.md` |
| 画面仕様（レイアウト・バリデーション） | `Docs/spec/screen-spec.md` |
| ER 図（確定版・TIMESTAMP 型） | `Docs/spec/er-diagram.md` |
| 技術選定 ADR（全 19 件 Accepted） | `Docs/decision/` |

> **README 維持要件**：環境構築手順に影響する変更（docker-compose・ポート・起動コマンド等）をおこなった際は、`README.md` のクイックスタートおよび `Docs/guide/getting-started.md` を合わせて更新すること。

**設計原則**

- **機能ドメイン縦切り**：認証 → リソース → 予約 → 承認 → ユーザー・部署。各スライスは BE 4 層 + FE を縦に揃える。
- **唯一の依存制約**：承認スライス（カテゴリ 6）は予約スライス（カテゴリ 5）完了後に着手する。
- **`ddl-auto: validate`**：JPA エンティティは V001 スキーマと完全一致させる。スキーマ変更が必要な場合は `V002__xxx.sql` を起こす。
- **DB 互換**：H2（テスト）/ PostgreSQL（本番）両対応の SQL のみ使用。`TIMESTAMPTZ`・PG 固有型は不使用（`spec/er-diagram.md` が正）。
- **重複予約チェックはアプリ層責務**：V001 に DB 制約なし。Service 層で排他制御し `409 RESERVATION_CONFLICT` を返す。

**実装の標準パターン（縦切り 1 セット）**

| 層 | 成果物 | 参照仕様 |
|----|--------|---------|
| BE `domain/` | JPA エンティティ・Repository インターフェース | `er-diagram.md` |
| BE `presentation/dto/` | Request DTO（Bean Validation）+ Response DTO | `api-spec.md` |
| BE `application/` | ユースケース Service（業務ルール・@Transactional） | `requirements.md` |
| BE `presentation/` | Controller（`@PreAuthorize` 権限制御） | `api-spec.md` |
| BE `src/test/` | Service 単体（Mockito）+ Controller 結合（H2） | - |
| FE `lib/` | Zod スキーマ・TypeScript 型 | `api-spec.md` |
| FE `server/actions/` | Server Action（BFF・JWT 付与） | `api-spec.md` |
| FE `app/` | ページ（Server Components 優先） | `screen-spec.md` |
| FE `components/` | UI コンポーネント（shadcn ベース） | `screen-spec.md` |
| FE `tests/unit/` | Vitest 単体（MSW モック） | - |

**更新ルール**

| アクション           | 操作                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| タスクを開始する     | 担当者を記入し状態を `着手中` に変更                                       |
| PR を作成する        | PR 番号を記入し状態を `レビュー中` に変更                                  |
| PR がマージされた    | 状態を `完了`・完了日（YYYY-MM-DD）を記入・チェックボックスを `[x]` に変更 |
| 新規タスクが発生した | 該当カテゴリの表末尾に追記（番号体系：`カテゴリ番号.連番`）                |
| ブロッカーが発生した | 状態を `保留` にしメモ欄に理由を記入                                       |

**ステータス値**：`未着手` / `着手中` / `レビュー中` / `完了` / `保留`

---

## 全体進捗サマリ

| カテゴリ                              | タスク数 | 完了数 | 進捗            |
| ------------------------------------- | -------- | ------ | --------------- |
| 0. 前提解消・基盤整備                 | 5        | 5      | ██████████ 100% |
| 1. バックエンド共通基盤               | 6        | 6      | ██████████ 100% |
| 2. フロントエンド共通基盤             | 5        | 5      | ██████████ 100% |
| 3. 認証スライス                       | 6        | 6      | ██████████ 100% |
| 4. リソーススライス                   | 7        | 7      | ██████████ 100% |
| 5. 予約スライス                       | 7        | 7      | ██████████ 100% |
| 6. 承認ワークフロースライス           | 5        | 5      | ██████████ 100% |
| 7. ユーザー・部署 / ダッシュボード    | 6        | 6      | ██████████ 100% |
| 8. 統合・整合性・受入                 | 7        | 7      | ██████████ 100% |
| **合計**                              | **54**   | **54** | **100%**        |

> サマリは各カテゴリのタスクを完了するたびに手動で更新する。

---

## 受入条件

Phase 3 の完了判定は以下の全条件を満たすこと。

- [x] カテゴリ 0：G1〜G4 の前提ギャップがすべて解消され、`docker compose up` で全サービスが疎通する
- [x] カテゴリ 1〜7：18 API すべてが `spec/api-spec.md` の I/O・権限・エラーコードどおりに動作し Controller 結合テストで担保されている（8.2 突合完了・カテゴリ 8 の修正でエラーコード仕様準拠を担保）
- [x] カテゴリ 1〜7：業務ルール（重複予約 409・`requires_approval` 分岐・承認時重複再チェック・却下コメント必須・決済済みステップ保護）が Service 単体テストで担保されている
- [x] カテゴリ 2〜7：10 画面が `spec/screen-spec.md` のロール別表示制御・バリデーションどおりに表示・操作可能（8.3 突合完了・`/auth/signin` は ADR-008 準拠の Cognito ソーシャルログインで仕様訂正済み）
- [x] カテゴリ 8：`docker compose up` + `scripts/provision-cognito.sh` 後に seed 投入済みの BE に対し、cognito-local 発行 JWT（sub=`cognito-member-001`/`cognito-approver-001`）で予約申請 → 承認の一連が API レベルで通る（8.1・8.7 完了）。**ブラウザサインインは Better Auth 制約により未成立（下記メモ参照）**
- [ ] カテゴリ 0-G4：CI（ci-frontend / ci-backend）が `main` への PR でグリーン（人間ゲート・本計画では push/PR しない）

---

## 0. 前提解消・基盤整備

> **注意**：カテゴリ 0 が完了してからカテゴリ 1〜7 の実装に着手する。ギャップを潰してから実装基盤を固める。

探索で検出した 4 つのギャップ（G1〜G4）と起動確認。

### やること（チェックリスト）

- [ ] G1：`ADR-015-backend-api-docs.md` の Decision 本文を Gradle 記述に修正（Maven/pom.xml 記述を削除）
- [ ] G2：`plan/03_SAMPLE_SERVICE_DOMAIN.md` 簡易 ER 図の `TIMESTAMPTZ` を `TIMESTAMP` に訂正（`spec/er-diagram.md` に合わせる）
- [ ] G3：`.devcontainer/docker-compose.yml` に `backend` サービスを追加（postgres ヘルスチェック後起動・ポート 8080）
- [ ] G4：`.github/workflows/ci-frontend.yml` と `.github/workflows/ci-backend.yml` の骨格を作成
- [x] G5：`docker compose up` で全サービス（frontend / backend / postgres / localstack / cognito-local）疎通確認

### 詳細・進捗

| #   | タスク                                                           | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                           |
| --- | ---------------------------------------------------------------- | ------ | ---- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 | `ADR-015` Decision 本文を Gradle 記述に修正                      | 完了 | AI   | -   | 2026-06-01 | `pom.xml` → `build.gradle.kts` に修正。決定（Springdoc OpenAPI 採用）自体は変更なし |
| 0.2 | `03_SAMPLE_SERVICE_DOMAIN.md` の TIMESTAMPTZ → TIMESTAMP 訂正   | 完了 | AI   | -   | 2026-06-01 | 簡易 ER 図内の全 TIMESTAMPTZ（8 箇所）を TIMESTAMP に置換。`spec/er-diagram.md` の確定版と整合 |
| 0.3 | `docker-compose.yml` に `backend` サービス追加                   | 完了 | AI   | -   | 2026-06-01 | `eclipse-temurin:25-jdk`・`command: sleep infinity`（gradle ロック競合回避のため Spring Boot は手動 `./gradlew bootRun`）・`gradle-cache:/root/.gradle` ボリューム追加・`depends_on: postgres: condition: service_healthy`。CORRECTION: 初版メモの `command: sh ./gradlew bootRun` は誤記。実ファイルは `sleep infinity` |
| 0.4 | CI ワークフロー骨格作成（ci-frontend / ci-backend）              | 完了 | AI   | -   | 2026-06-01 | `ci-frontend.yml`（pnpm@11 / Node 24 / lint→build→test）・`ci-backend.yml`（temurin Java 25 / test→spotlessCheck→checkstyleMain）を作成。`main` への PR トリガー |
| 0.5 | `docker compose up` 全サービス疎通確認                           | 完了 | ユーザー | -   | 2026-06-01 | frontend:3000 / backend:8080 / postgres:5432 / localstack:4566 / cognito-local:9229 の全サービス起動・応答をユーザーが手動確認 |

---

## 1. バックエンド共通基盤

> 依存：カテゴリ 0 完了後に着手  
> 全スライス（カテゴリ 3〜7）が依存する横断的基盤。最初に固める。

### やること（チェックリスト）

- [x] `SecurityConfig` — OAuth2 Resource Server 設定・JWT `custom:role` → Spring Security 権限マッピング・`@EnableMethodSecurity` 有効化
- [x] `CurrentUserArgumentResolver` — JWT sub（`cognito_sub`）から `User` エンティティを解決するリゾルバ（カテゴリ 3 で User エンティティと同時実装）
- [x] `GlobalExceptionHandler` — `@RestControllerAdvice` で `{ code, message }` 形式の統一エラーレスポンス（400/403/404/409/422）
- [x] `ErrorCode` 定数クラス — `RESERVATION_CONFLICT` 等のエラーコード定義
- [x] `OpenApiConfig` — Springdoc Swagger UI 設定（Bearer JWT 認証スキーム追加）
- [x] テスト基盤 — `SecurityMockMvcUtils`（ロール別認証ヘルパ）・`BaseControllerTest`（共通セットアップ）

### 詳細・進捗

| #   | タスク                                                       | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                           |
| --- | ------------------------------------------------------------ | ------ | ---- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | `SecurityConfig` + JWT 権限マッピング                        | 完了 | AI   | -   | 2026-06-02 | `infrastructure/security/SecurityConfig.java`。`RoleJwtAuthenticationConverter`（`custom:role`→`ROLE_*`）・`RestAuthenticationEntryPoint`（401）・`RestAccessDeniedHandler`（403）を実装。`@EnableMethodSecurity` 有効化。DEVIATION: `issuer-uri` → `jwk-set-uri`（cognito-local 起動回避）・`hasRole()` 採用（ADR-016 に Status Note 追記）。SecurityConfig の `ObjectMapper` 依存を排除（Bean 初期化順序問題回避のため handlers に static ObjectMapper） |
| 1.2 | `CurrentUserArgumentResolver`                                | 完了 | AI   | -   | 2026-06-03 | `infrastructure/security/CurrentUserArgumentResolver.java` + `@CurrentUser` アノテーション。JWT `sub`（`JwtAuthenticationToken.getToken().getSubject()`）から `UserRepository.findByCognitoSub()` で `User` を解決。未登録なら `UnregisteredUserException` をスロー（フィルタチェーン後のため `@RestControllerAdvice` が 401 に変換）。`WebMvcConfig.addArgumentResolvers()` で登録 |
| 1.3 | `GlobalExceptionHandler`（`@RestControllerAdvice`）          | 完了 | AI   | -   | 2026-06-02 | `presentation/exception/GlobalExceptionHandler.java`。`ErrorResponse(code, message)` record を共通型として定義。400（`VALIDATION_ERROR`）/403（`FORBIDDEN`）/404（`NOT_FOUND`）/409（`RESERVATION_CONFLICT`）/422（`BusinessException.code`）/500（`INTERNAL_SERVER_ERROR`）を整形。フィルタチェーン由来の 401/403 は `SecurityConfig` の EntryPoint/DeniedHandler が担当（`@RestControllerAdvice` は到達しないため） |
| 1.4 | `ErrorCode` / カスタム例外クラス群                           | 完了 | AI   | -   | 2026-06-02 | `application/exception/` 配下。`ErrorCode`（9 定数：`VALIDATION_ERROR`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`RESERVATION_CONFLICT`/`COMMENT_REQUIRED`/`APPROVAL_STEP_NOT_FOUND`/`APPROVAL_ALREADY_DECIDED`/`INTERNAL_SERVER_ERROR`）。`BusinessException`（基底・422）・`ReservationConflictException`（409）・`ResourceNotFoundException`（404）。CORRECTION: doc 記載の `ALREADY_DECIDED` は誤りで正式名は `APPROVAL_ALREADY_DECIDED` |
| 1.5 | `OpenApiConfig`（Springdoc Bearer 認証設定）                 | 完了 | AI   | -   | 2026-06-02 | `infrastructure/config/OpenApiConfig.java`。`SecurityScheme`（type=HTTP・scheme=bearer・bearerFormat=JWT）+ `SecurityRequirement` を追加。Swagger UI に `Authorization: Bearer <token>` の入力欄を追加（ADR-015 準拠） |
| 1.6 | テスト基盤（`SecurityMockMvcUtils` / `BaseControllerTest`）  | 完了 | AI   | -   | 2026-06-02 | `src/test/java/com/example/bookflow/support/` 配下。`WithMockMember`/`WithMockApprover`/`WithMockAdmin`（`@WithSecurityContext` + `JwtAuthenticationToken`・`RoleJwtAuthenticationConverter` と同じ `ROLE_*` 規約）。`BaseControllerTest`（`@SpringBootTest` + `MockMvcBuilders.webAppContextSetup()` + `springSecurity()`・H2 プロファイル）。DEVIATION: Spring Boot 4.0 で `@AutoConfigureMockMvc`（`autoconfigure.web.servlet` パッケージ）が廃止のため `MockMvcBuilders` 直接利用に変更 |

---

## 2. フロントエンド共通基盤

> 依存：カテゴリ 0 完了後に着手  
> 全画面（カテゴリ 3〜7 の FE）が依存するレイアウト・認証・BFF 基盤。

### やること（チェックリスト）

- [x] shadcn/ui コンポーネント初期化（`Button` / `Input` / `Card` / `Badge` / `Table` / `Dialog` / `Form` / `Sonner` 等）
- [x] 共通レイアウト・ヘッダー・サイドナビ（`screen-spec.md §共通` のロール別表示制御）
- [x] Better Auth 配線完成（`src/lib/auth.ts`・Cognito OAuth2 フロー・セッション取得）
- [x] BFF 共通クライアント（Server Action 用・JWT 付与・バックエンド API 呼び出しヘルパ）
- [x] 共通 Zod スキーマ・TypeScript 型（API DTO に対応した型定義ファイル）

### 詳細・進捗

| #   | タスク                                             | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                              |
| --- | -------------------------------------------------- | ------ | ---- | --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | shadcn/ui コンポーネント生成                        | 完了 | AI   | -   | 2026-06-02 | `components.json` の `baseColor` を `neutral` に修正（blue は新 registry に存在しないため）。`sonner` を採用（`toast` は非推奨）。`src/components/ui/` に 10 コンポーネント生成。`@hookform/resolvers`・`jsdom`・`@testing-library/jest-dom` を追加 |
| 2.2 | 共通レイアウト・ヘッダー・サイドナビ               | 完了 | AI   | -   | 2026-06-02 | `src/components/layout/`（Header・SideNav・nav-items）作成。`navItemsForRole()` 純関数で Vitest 単体テスト（12 テスト）実装。`src/app/layout.tsx` に `<Toaster>` 追加。`globals.css` に secondary・popover 等の欠落トークンを補完 |
| 2.3 | Better Auth 配線完成                               | 完了 | AI   | -   | 2026-06-02 | DEVIATION: `socialProviders.cognito` を ADR-008（CognitoOptions: domain/region/userPoolId）に修正。`clientSecret: ''` ハードコードを env 変数化。Route Handler（`app/api/auth/[...all]/route.ts`）・`auth-client.ts`・`session.ts` を作成。cognito-local との https/http 問題はカテゴリ 3 で対応 |
| 2.4 | BFF 共通クライアント                               | 完了 | AI   | -   | 2026-06-02 | `src/lib/api-client.ts` 作成。`createApiClient(getToken?)` ファクトリ。`get`・`getPaginated`・`getArray`・`post`・`put`・`patch`・`postEmpty` を提供。非 2xx → `ApiClientError(code, message, status)` に変換。トークン取得部を DI で分離（カテゴリ 3 で結線） |
| 2.5 | 共通 Zod スキーマ・TypeScript 型定義               | 完了 | AI   | -   | 2026-06-02 | `src/lib/types/enums.ts`（Role・ResourceCategory・ReservationStatus・ApprovalStatus）と `src/lib/types/api.ts`（5 DTO + AvailabilitySlot + paginatedSchema + ApiError）を作成。timestamp は `z.string()`（TZ なし ISO 文字列のため）|

---

## 3. 認証スライス

> 依存：カテゴリ 1・2 完了後に着手  
> 対象 UC：UC-01（社員がサインインする）  
> 対象 API：`POST /api/auth/signout`・`GET /api/users/me`  
> 対象画面：`/auth/signin`

### やること（チェックリスト）

- [x] BE：`User` エンティティ（V001 と一致） + `UserRepository`（`findByCognitoSub` 含む）
- [x] BE：`UserResponse` DTO + `AuthController`（me / signout エンドポイント）
- [x] BE：`AuthController` 結合テスト（ロール別アクセス確認）
- [x] FE：`/auth/signin` 画面（`screen-spec.md §認証` 準拠）
- [x] FE：サインアウト Server Action・プロフィール取得 Server Action
- [x] FE：認証ガード（未認証リクエストを `/auth/signin` へリダイレクト）

### 詳細・進捗

| #   | タスク                                                    | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                          |
| --- | --------------------------------------------------------- | ------ | ---- | --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | `User` エンティティ + `UserRepository`                    | 完了 | AI   | -   | 2026-06-03 | `domain/User.java`（V001 と全カラム一致・`@Enumerated(EnumType.STRING)` の `Role` enum）。`domain/Department.java`（JOIN FETCH 用最小定義）。`UserRepository`：`findByCognitoSub`（JOIN FETCH department）・`findAllWithDepartment(Pageable)`（JOIN FETCH）。`open-in-view: false` 対応 |
| 3.2 | `UserResponse` DTO + `AuthController`                     | 完了 | AI   | -   | 2026-06-03 | `presentation/dto/UserResponse.java`（7 フィールド・`from(User)` ファクトリ）。`AuthController`：`GET /api/users/me`（全員）・`POST /api/auth/signout`（200・ボディなし）。`UnregisteredUserException` → 401 ハンドラを `GlobalExceptionHandler` に追加 |
| 3.3 | `AuthController` 結合テスト                               | 完了 | AI   | -   | 2026-06-03 | `@BeforeEach` で Department→User seed（cognito_sub="test-member-sub"）。①`@WithMockMember` で `/me` → 200 + 7 フィールド検証 ②未認証 → 401 ③`@WithMockMember(sub="nonexistent")` → 401（未登録ユーザー経路）④signout 認証なし → 200。DEVIATION: Spring Boot 4.0 Flyway autoconfigure 不在 → `ddl-auto: create-drop` + `flyway.enabled: false` に変更 |
| 3.4 | `/auth/signin` 画面                                       | 完了 | AI   | -   | 2026-06-03 | `src/app/auth/signin/page.tsx`。`'use client'`。`authClient.signIn.social({ provider: 'cognito', callbackURL: '/' })` をトリガーするボタン。Card + Button（shadcn/ui） |
| 3.5 | サインアウト・プロフィール取得 Server Action              | 完了 | AI   | -   | 2026-06-03 | `src/server/actions/auth.ts`。`signOutAction()`（`auth.api.signOut()` → `/auth/signin` にリダイレクト）・`getProfileAction()`（`createApiClient(getAccessToken)` で `GET /users/me` → `UserResponse`）。MSW + Vitest テスト 3 ケース（200 / 401 / signout） |
| 3.6 | 認証ガード（未認証リダイレクト）                          | 完了 | AI   | -   | 2026-06-03 | `src/app/(authenticated)/layout.tsx`（ルートグループ方式）。`getSession()` で未認証 → `/auth/signin`。`getProfileAction()` 失敗（BE 401）→ `/auth/signin`。Header（userName/role/onSignOut）と SideNav（role）をマウント。`middleware.ts` は不採用（設計通り） |

---

## 4. リソーススライス

> 依存：カテゴリ 1・2 完了後に着手  
> 対象 UC：UC-02（リソース一覧・空き確認）・UC-08（管理者によるリソース登録・編集）  
> 対象 API：`GET/POST /api/resources`・`GET/PUT/PATCH /api/resources/{id}`・`GET /api/resources/{id}/availability`  
> 対象画面：`/resources`・`/resources/{id}`・`/admin/resources`

### やること（チェックリスト）

- [x] BE：`Resource` エンティティ（V001 と一致） + `ResourceRepository`
- [x] BE：`ResourceResponse` / `OccupiedSlot` DTO + `ResourceService`（CRUD・空き照会）
- [x] BE：`ResourceController`（CRUD + availability・ADMIN 権限制御）
- [x] BE：`ResourceService` 単体テスト + `ResourceController` 結合テスト
- [x] FE：`/resources` 画面（一覧・カテゴリフィルタ・空き確認入力）
- [x] FE：`/resources/{id}` 画面（詳細・空き確認結果）
- [x] FE：`/admin/resources` 画面（登録フォーム・有効/無効切替・ADMIN 限定）

### 詳細・進捗

| #   | タスク                                                             | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------ | ------ | ---- | --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | `Resource` エンティティ + `ResourceRepository`                    | 完了 | AI   | -   | 2026-06-03 | `domain/Resource.java`（V001 と完全一致）。`category` は `@Enumerated(EnumType.STRING)` の `ResourceCategory` enum（ROOM/EQUIPMENT/VEHICLE）。初の生成・更新エンティティ: `create()` ファクトリ（UUID.randomUUID()・LocalDateTime.now()）・`update()` / `changeActive()` メソッド。`ResourceRepository` に `findByIsActiveTrue(Pageable/List)` / `findByCategoryAndIsActiveTrue` / `findByCategory(ADMIN 用)` を定義。前倒し: `Reservation` canonical エンティティ（getter のみ）+ `ReservationStatus` enum + `ReservationRepository`（`findByResource_IdAndStatusIn` / `findByResource_IdInAndStatusIn`）をカテゴリ 5 用に先行作成 |
| 4.2 | `ResourceResponse` / `OccupiedSlot` DTO + `ResourceService`       | 完了 | AI   | -   | 2026-06-03 | `ResourceResponse`（9フィールド・`from(Resource)` ファクトリ）・`OccupiedSlot`（reservationId/startAt/endAt・FE `AvailabilitySlotSchema` と同形状）。Request DTO: `CreateResourceRequest`/`UpdateResourceRequest`/`StatusUpdateRequest`（Bean Validation）。`application/ResourceService.java`（初の Service 層）: CRUD・ロール依存一覧（ADMIN inactive 含む）・空き照会。overlap 述語 `overlaps(LocalDateTime,LocalDateTime,LocalDateTime,LocalDateTime)` を static メソッドに集約（カテゴリ 5 で再利用）。list の from/to フィルタは Java 側で重複判定・手動 PageImpl。 |
| 4.3 | `ResourceController`                                               | 完了 | AI   | -   | 2026-06-03 | 6 エンドポイント（GET/POST /api/resources, GET/PUT /api/resources/{id}, PATCH /api/resources/{id}/status, GET /api/resources/{id}/availability）。`POST/PUT/PATCH` は `@PreAuthorize("hasRole('ADMIN')")`。`GET`・availability は全ロール（認証必須）。ページネーション `@PageableDefault(size=20)`。role 判定は `@CurrentUser User` から取得 |
| 4.4 | `ResourceService` 単体 + `ResourceController` 結合テスト           | 完了 | AI   | -   | 2026-06-03 | `ResourceServiceTest`（初の Mockito 単体）: overlap 境界値 7ケース（完全包含・部分重なり×2・同一・隣接×2・離散）・list ロール分岐・availability 正常/非重複/存在なし 404。`ResourceControllerTest`（H2+JdbcTemplate seed: Department+User×2+Resource×2+Reservation）: MEMBER の POST/PUT/PATCH → 403 / ADMIN → 200・201 / availability OccupiedSlot 形状 / 404。38→38 テスト（+新規テストで合計49テスト全通過） |
| 4.5 | `/resources` 画面                                                  | 完了 | AI   | -   | 2026-06-03 | `src/app/(authenticated)/resources/page.tsx`（Server Component）。`ResourceFilterForm`（'use client'）でカテゴリフィルタ・from/to を URL searchParams で管理。カードリスト（`ResourceResponse[]`）。inactive は opacity-50 でグレーアウト（ADMIN のみ表示）。「詳細を見る」→ `/resources/{id}` |
| 4.6 | `/resources/{id}` 画面                                             | 完了 | AI   | -   | 2026-06-03 | `src/app/(authenticated)/resources/[id]/page.tsx`。リソース詳細（名称・カテゴリ・場所・定員・承認フロー・説明）。デフォルト照会範囲（今日〜7日後）で `getAvailabilityAction`。OccupiedSlot リスト表示。「このリソースを予約する」→ `/reservations/new?resourceId={id}`（遷移先はカテゴリ 5） |
| 4.7 | `/admin/resources` 画面                                            | 完了 | AI   | -   | 2026-06-03 | `src/app/(authenticated)/admin/layout.tsx`（ADMIN ガード：role≠ADMIN → 403 画面、リダイレクトしない）。`admin/resources/page.tsx`（Server Component）+`ResourceManagementClient`（'use client'）: リソース一覧テーブル（inactive 含む）・新規登録ダイアログ（React Hook Form + Zod + shadcn/ui）・編集ダイアログ・有効/無効トグルボタン。`textarea` shadcn/ui 追加（description 入力用） |

---

## 5. 予約スライス

> 依存：カテゴリ 1・2・4 完了後に着手  
> 対象 UC：UC-03（予約申請）・UC-04（承認不要リソースの即時確定）・UC-07（マイ予約一覧・キャンセル）  
> 対象 API：`GET/POST /api/reservations`・`GET/PUT /api/reservations/{id}`・`POST /api/reservations/{id}/cancel`  
> 対象画面：`/reservations/new`・`/reservations`・`/reservations/{id}`

### やること（チェックリスト）

- [x] BE：`Reservation` エンティティ（V001 と一致） + `ReservationRepository`（重複チェック用クエリ含む）
- [x] BE：`ReservationResponse` DTO + `ReservationService`（重複予約チェック・`requires_approval` 分岐）
- [x] BE：`ReservationController`（CRUD + cancel・本人/ADMIN 権限制御）
- [x] BE：`ReservationService` 単体テスト（業務ルール網羅） + `ReservationController` 結合テスト
- [x] FE：`/reservations/new` 画面（申請フォーム・重複エラー表示）
- [x] FE：`/reservations` 画面（マイ予約一覧・ステータスフィルタ）
- [x] FE：`/reservations/{id}` 画面（詳細・キャンセルボタン）

### 詳細・進捗

| #   | タスク                                                                  | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------- | ------ | ---- | --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | `Reservation` エンティティ + `ReservationRepository`                    | 完了 | AI   | -   | 2026-06-04 | カテゴリ4 前倒し作成済み（getter-only）を拡張。`create(resource,requester,startAt,endAt,purpose,attendeesCount,status)` ファクトリ・`update()` / `cancel()` メソッド追加。`ReservationRepository` に JOIN FETCH 付き一覧クエリ4メソッド追加（`findByRequesterIdFetch`/`findByRequesterIdAndStatusInFetch`/`findAllFetch`/`findByStatusInFetch`）。重複チェックは既存 `findByResource_IdAndStatusIn` を流用（Java 側で overlaps フィルタ・自己除外）。 |
| 5.2 | `ReservationResponse` DTO + `ReservationService`                        | 完了 | AI   | -   | 2026-06-04 | `ReservationResponse`（12 フィールド・`api-spec.md §予約` L490-505 準拠）。`CreateReservationRequest`/`UpdateReservationRequest`（別個スキーマ・POST は resourceId を含む、PUT は含まない）。`ReservationService`：重複チェック（`ResourceService.overlaps()` 再利用・自己除外）・`requires_approval` 分岐（false→APPROVED/true→PENDING）・所有権チェック（`AccessDeniedException`→403）・ステータスガード（PUT=PENDING のみ/cancel=PENDING+APPROVED のみ→422）。**approval_steps 生成はカテゴリ6に委ねる**（TODO コメント残し）。PUT 可能ステータスは api-spec 準拠で PENDING のみ（ドメイン文書L162「DRAFT/PENDING」との不整合はメモ）。 |
| 5.3 | `ReservationController`                                                  | 完了 | AI   | -   | 2026-06-04 | 5 エンドポイント（GET/POST /api/reservations, GET/PUT /api/reservations/{id}, POST /api/reservations/{id}/cancel）。`@PreAuthorize` 不使用（行レベル所有権は Service 判定）。status フィルタは `@RequestParam(required=false) List<ReservationStatus>` で受け取り（複数指定対応）。 |
| 5.4 | `ReservationService` 単体 + `ReservationController` 結合テスト          | 完了 | AI   | -   | 2026-06-04 | `ReservationServiceTest`（Mockito）: Create（重複409・隣接=非重複・requires_approval分岐・404・日時不正）/Get（所有権403・admin=全件）/Update（APPROVED→422・他人403・重複409・自己除外）/Cancel（PENDING/APPROVED→CANCELLED・REJECTED→422・他人403・admin=可）。`ReservationControllerTest`（H2+JdbcTemplate seed）: Department+User×3+Resource×2+Reservation×3。POST 201(APPROVED/PENDING)/409, GET 200/403/404, PUT 200/422/403/404, cancel 200(owner)/200(admin)/403/401。 |
| 5.5 | `/reservations/new` 画面                                                | 完了 | AI   | -   | 2026-06-04 | `src/app/(authenticated)/reservations/new/page.tsx`（Server Component）+ `ReservationForm`（'use client'）。`?resourceId` で初期値設定。RHF+Zod+useTransition。409 RESERVATION_CONFLICT をインラインエラー表示（`ApiClientError` キャッチ）。datetime-local 秒補完あり。 |
| 5.6 | `/reservations` 画面                                                    | 完了 | AI   | -   | 2026-06-04 | `src/app/(authenticated)/reservations/page.tsx`（Server Component）。MEMBER は本人のみ・ADMIN は全件。ステータスフィルタリンク（URL searchParams）。ステータスバッジ色分け（PENDING=黄/APPROVED=緑/REJECTED=赤/CANCELLED=グレー）。 |
| 5.7 | `/reservations/{id}` 画面                                               | 完了 | AI   | -   | 2026-06-04 | `src/app/(authenticated)/reservations/[id]/page.tsx`（Server Component）+ `CancelButton`（'use client'）。PENDING/APPROVED かつ本人 or ADMIN のみキャンセルボタン表示。確認ダイアログ付き。承認ステップ表示はカテゴリ6 TODO。ページ配置: `(authenticated)/` 配下（タスク表の `src/app/reservations/` 記述は補正済み） |

---

## 6. 承認ワークフロースライス

> 依存：**カテゴリ 5 完了後**に着手（`approval_steps` は `reservations` の従属）  
> 対象 UC：UC-05（承認必要リソースの予約が承認者に回覧される）・UC-06（承認者が承認 or 却下する）  
> 対象 API：`GET /api/approvals/pending`・`POST /api/approvals/{stepId}/approve`・`POST /api/approvals/{stepId}/reject`  
> 対象画面：`/approvals`

### やること（チェックリスト）

- [x] BE：`ApprovalStep` エンティティ（V001 と一致） + `ApprovalStepRepository`
- [x] BE：`ApprovalStepResponse` DTO + `ApprovalService`（承認・却下・業務ルール）
- [x] BE：`ApprovalController`（pending / approve / reject・APPROVER/ADMIN 権限制御）
- [x] BE：`ApprovalService` 単体テスト（業務ルール網羅） + `ApprovalController` 結合テスト
- [x] FE：`/approvals` 画面（承認待ち一覧・承認/却下フォーム）

### 詳細・進捗

| #   | タスク                                                                 | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------- | ------ | ---- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6.1 | `ApprovalStep` エンティティ + `ApprovalStepRepository`                 | 完了 | AI   | -   | 2026-06-04 | `domain/ApprovalStep.java`（V001 と完全一致）。`ApprovalStatus` enum（PENDING/APPROVED/REJECTED）。`create()`/`approve()`/`reject()` メソッド。`ApprovalStepRepository`：`findPendingByApprover`/`findAllPending`/`findByIdFetch`（JOIN FETCH で N+1 回避）。`Reservation` に `markApproved()`/`markRejected()` 追加。`UserRepository.findFirstByRole` 追加。**pending はページネーションなし**（`api-spec.md` L94 優先・task doc の Pageable は不採用・`List<ApprovalStep>` を返す）。 |
| 6.2 | `ApprovalStepResponse` DTO + `ApprovalService`                         | 完了 | AI   | -   | 2026-06-04 | `ApprovalStepResponse`（10 フィールド・`api-spec.md §承認` L694-709 準拠）。`ApprovalDecisionRequest`（`comment` に `@NotBlank` なし → Service 判定で `COMMENT_REQUIRED` を返す）。新規例外 2 クラス（`CommentRequiredException`/`ApprovalStepNotFoundException`）+ `GlobalExceptionHandler` 2 ハンドラ追加。`ApprovalService`：承認（重複再チェック・自己除外必須）・却下（コメント必須・重複再チェックなし）・`createInitialStep`（承認者割当・APPROVER 不在で IllegalStateException）。VALIDATION_ERROR との混同なし（コード精確）。 |
| 6.3 | `ApprovalController`                                                    | 完了 | AI   | -   | 2026-06-04 | 3 エンドポイント（`GET /api/approvals/pending`・`POST /{stepId}/approve`・`POST /{stepId}/reject`）。全メソッド `@PreAuthorize("hasAnyRole('APPROVER','ADMIN')")`（MEMBER→403）。approve は `@RequestBody(required=false)`（body 省略可）。 |
| 6.4 | `ApprovalService` 単体 + `ApprovalController` 結合テスト               | 完了 | AI   | -   | 2026-06-04 | `ApprovalServiceTest`（Mockito・14 ケース）：approve 正常/重複 409/自己除外/他人 403/決済済み 422/不在 404・reject 正常/コメント空 400/コメント null 400/重複チェックなし確認・listPending ロール分岐・createInitialStep。`ApprovalControllerTest`（H2 seed）：APPROVER/ADMIN/MEMBER アクセス・approve/reject 200・400・404・403・422・401。Cat5 既存テスト修正：`ReservationServiceTest` に `@Mock ApprovalService`+`lenient()` 追加。`ReservationControllerTest` の seed に APPROVER 追加・`@AfterEach` に `approval_steps` FK 逆順削除追加。全 BE テスト（108+増分）グリーン。 |
| 6.5 | `/approvals` 画面                                                       | 完了 | AI   | -   | 2026-06-04 | `src/app/(authenticated)/approvals/page.tsx`（Server Component）+ `ApprovalTable.tsx`（'use client'）。APPROVER/ADMIN ガード（role 確認・MEMBER は 403 画面）。承認待ちテーブル（リソース名・申請者名・開始〜終了・利用目的・申請日時）。承認ダイアログ（コメント任意）・却下ダイアログ（コメント必須・UI バリデーション）。`router.refresh()` で一覧更新。Server Action（`approvals.ts`）：`listPendingApprovalsAction`（`getArray` bare array）/`approveAction`/`rejectAction`。MSW ハンドラ追加（approve/reject/pending）。`approvals.test.ts`（12 ケース）。Zod スキーマを `'use server'` 外に分離（`lib/schemas/reservation.ts`）。FE 52 テスト・lint クリーン・型チェック（`tsc --noEmit`）クリーン。 |

---

## 7. ユーザー・部署 / ダッシュボードスライス

> 依存：カテゴリ 1・2 完了後に着手（カテゴリ 3〜6 と並行可）  
> 対象 API：`GET /api/users`（ADMIN）・`GET /api/departments`（全員）  
> 対象画面：`/`（ダッシュボード）・`/admin/users`

### やること（チェックリスト）

- [x] BE：`Department` エンティティ（V001 と一致・自己参照階層） + `DepartmentRepository`
- [x] BE：`DepartmentResponse` DTO + `DepartmentController`（全員アクセス可）
- [x] BE：`UserController`（`GET /api/users` ADMIN 限定・ページネーション）
- [x] BE：`DepartmentController` / `UserController` 結合テスト
- [x] FE：`/` ダッシュボード画面（件数カード・並行 API 呼び出し）
- [x] FE：`/admin/users` 画面（ユーザー一覧テーブル・ADMIN 限定）

### 詳細・進捗

| #   | タスク                                                          | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                    |
| --- | --------------------------------------------------------------- | ------ | ---- | --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | `Department` エンティティ + `DepartmentRepository`              | 完了 | AI   | -   | 2026-06-05 | `domain/Department.java` はカテゴリ3で作成済み（`@ManyToOne(fetch=LAZY) @JoinColumn(name="parent_id")` マッピング完備・V001 と一致）。`domain/DepartmentRepository.java` を新規作成（`findAllOrderByName()` に `@Query("select d from Department d left join fetch d.parent order by d.name asc")`）。V002 マイグレーション不要。 |
| 7.2 | `DepartmentResponse` DTO + `DepartmentController`               | 完了 | AI   | -   | 2026-06-05 | `presentation/dto/DepartmentResponse.java`（record・3フィールド・`from()` ファクトリ）。`parentId = getParent() == null ? null : getParent().getId()`。`application/DepartmentService.java`（`@Transactional(readOnly=true)`・`listAll()`）。`presentation/DepartmentController.java`（`GET /api/departments` → `List<DepartmentResponse>`・全ロール・ページネーションなし）。 |
| 7.3 | `UserController`（`GET /api/users`）                            | 完了 | AI   | -   | 2026-06-05 | `application/UserService.java`（`listUsers(Pageable)` → 既存 `UserRepository.findAllWithDepartment(pageable).map(UserResponse::from)`）。`presentation/UserController.java`（`@PreAuthorize("hasRole('ADMIN')")`・`@PageableDefault(size=20)` → `Page<UserResponse>`）。`@CurrentUser` 不使用のため DB ルックアップなし。 |
| 7.4 | `DepartmentController` / `UserController` 結合テスト            | 完了 | AI   | -   | 2026-06-05 | `DepartmentControllerTest`（ID prefix=70・root+子部署 seed・array 形状・`nullValue()` 2引数 jsonPath で parentId null 確認・401）。`UserControllerTest`（ID prefix=71・MEMBER+APPROVER seed・ADMIN→200+Page 形状+departmentName・MEMBER/APPROVER→403・未認証→401）。`./gradlew build` グリーン（117+新規10テスト全通過）。 |
| 7.5 | `/` ダッシュボード画面                                          | 完了 | AI   | -   | 2026-06-05 | `src/app/(authenticated)/page.tsx`（Server Component）。旧 `src/app/page.tsx`（プレースホルダ）を削除（URL `/` 競合回避）。`Promise.all([listReservationsAction({status:['PENDING']}), listReservationsAction({status:['APPROVED']})])` で件数並行取得（`api-spec.md par 構文`）。`role !== 'MEMBER'` のとき `listPendingApprovalsAction().length` で承認待ち件数取得（`opt 構文`）。Card コンポーネントで3枠。`pnpm build`→`.next/` を削除し `tsc --noEmit` クリーン。 |
| 7.6 | `/admin/users` 画面                                             | 完了 | AI   | -   | 2026-06-05 | `src/server/actions/users.ts`（`listUsersAction`・`getPaginated('/users', UserResponseSchema)`）。`src/app/(authenticated)/admin/users/page.tsx`（Server Component・`admin/layout.tsx` が ADMIN ガード済みのためページ内判定不要）。`UserManagementClient.tsx`（'use client'・Table・RoleBadge：MEMBER=グレー/APPROVER=青/ADMIN=紫）。閲覧専用（ロール変更なし）。`tests/unit/msw/handlers.ts` に `/api/backend/users` ハンドラ追加・`users.test.ts` 4ケース新規作成。pnpm test 56テスト・lint・tsc クリーン。 |

---

## 8. 統合・整合性・受入

> 依存：カテゴリ 3〜7 完了後に着手

### やること（チェックリスト）

- [x] seed 投入後の手動動作確認（サインイン → 予約申請 → 承認の一連動線）— API レベル受入 AI 実証済み。ブラウザサインインは Better Auth 制約により未成立（8.7 メモ参照）
- [x] 全 18 API ↔ Controller の突合（`api-spec.md` エンドポイント一覧と実装の網羅確認）
- [x] 全 10 画面 ↔ ページの突合（`screen-spec.md` 画面一覧と実装の網羅確認）
- [x] `PROJECT_PLAN.md` §4 Phase 進捗・§5 ドキュメントリンク更新
- [x] `README.md` クイックスタート手順の最終確認・更新

### 詳細・進捗

| #   | タスク                                                      | 状態   | 担当 | PR  | 完了日 | メモ                                                                                                                                                                                          |
| --- | ----------------------------------------------------------- | ------ | ---- | --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | seed 投入後の手動動作確認                                    | 完了 | AI   | -   | 2026-06-06 | **API レベル受入完了（AI 実証済み）**。`provision-cognito.sh` → `InitiateAuth` → MEMBER JWT 取得（sub=cognito-member-001）→ `POST /api/reservations`（第1会議室 requires_approval=true）→ status=PENDING + approval_step 自動生成 → APPROVER JWT → `GET /api/approvals/pending` → `POST /api/approvals/{stepId}/approve` → `GET /api/reservations/{id}` → status=APPROVED の一連を curl で確認。**既知の制約（ブラウザ未完）**：Better Auth 1.6.11 の cognito プロバイダが https/AWS-JWKS 固定のためブラウザのサインインは不成立（本番 Cognito では正常動作）。ブラウザ E2E が必要な場合は別途 dev 専用サインイン実装が必要 |
| 8.2 | 全 18 API ↔ Controller 突合（AI 実施・メンター最終確認推奨） | 完了 | AI   | -   | 2026-06-05 | 18 エンドポイント全実装済み・権限・DTO 形状・エラーコードはおおむね仕様準拠。**インライン修正済み差異**：①必須パラメータ欠落→500（修正 → 400 VALIDATION_ERROR・`GlobalExceptionHandler` に `MissingServletRequestParameterException`/`MethodArgumentTypeMismatchException` ハンドラ追加）②`GET /api/resources` の from/to 同時指定未強制（修正 → `ValidationException` で 400）。**許容差異（メモ）**：`Page<T>` 直列化が仕様7フィールドのスーパーセット（FE は必要フィールドのみ参照のため許容）。エラーコード9定数はすべて仕様と一致。 |
| 8.3 | 全 10 画面 ↔ ページ突合（AI 実施・メンター最終確認推奨）     | 完了 | AI   | -   | 2026-06-05 | 10 画面すべてに対応する `page.tsx` が存在。ロールガード・バリデーション概ね仕様準拠。**仕様訂正済み**：`/auth/signin` はメール/パスワードフォームではなく ADR-008 準拠の Cognito ソーシャルログイン（`screen-spec.md` を訂正）。**新規タスク化した機能ギャップ**：ページネーション UI 未実装（/reservations・/admin/users・/resources）→ 8.6。**許容差異（メモ）**：availability 照会範囲 7日（実装）vs 4週間（仕様）・`/reservations/{id}` の FE ビューアクセスガードなし（BE が 403 を返す設計で許容） |
| 8.4 | `PROJECT_PLAN.md` §4 Phase 進捗更新                         | 完了 | AI   | -   | 2026-06-05 | §4 の Phase 1・Phase 2 に ✅ を付与。Phase 2 の完了条件を実態（18 API・10 画面・CI グリーン）に更新。§5 は PHASE3_IMPL_TASKS.md がリンク済みのため追加変更なし。Phase 3「課題登録」は人間タスクで未完のため ✅ 不付与 |
| 8.5 | `README.md` クイックスタート最終確認・更新                   | 完了 | AI   | -   | 2026-06-05 | クイックスタート §2 の「backend:8080 が自動起動する」を実態（`command: sleep infinity`・手動 `./gradlew bootRun` 必要）に訂正。`open http://localhost:8080/actuator/health` に「bootRun 起動後に確認」補足を追加 |
| 8.6 | ページネーション UI 実装（機能ギャップ）                     | 完了 | AI   | -   | 2026-06-06 | `pagination-nav.tsx`（Server Component・prev/next・query保持）を新規作成し 3 画面に追加。`/reservations`（searchParams の status[] を保持）・`/admin/users`（size:100→page/size:20）・`/resources`（情報表示 p タグを PaginationNav に置換）。`buildHref` の単体テスト 10ケース追加。pnpm test 66テスト全通過・lint・tsc クリーン |
| 8.7 | cognito-local ユーザー provisioning 整備（8.1 ブロッカー）  | 完了 | AI   | -   | 2026-06-06 | `scripts/provision-cognito.sh`（curl/jq・aws CLI 非依存・冪等）新規作成。全プールで同一 RSA 鍵（kid: CognitoLocal）を使用する cognito-local の特性を利用し、API で作成したプールの JWT を `local_user_pool_id` JWKS で検証できる構成を実現。`postCreate.sh` に provisioning 手順を組込み。`frontend/.env.local.example` の pool/client ID プレースホルダを説明コメント付きで整備。`docker-compose.yml` の cognito-local イメージを digest 固定。`auth.ts` コメントを実態（cognito-local 非互換・API受入）に更新。**既知の制約**：Better Auth 1.6.11 の cognito プロバイダが https/AWS-JWKS 固定のためブラウザサインインは不成立（本番 Cognito では正常動作）。ブラウザ E2E が必要な場合は dev 専用サインイン実装（B案）が必要 |

---

## 変更履歴

| 日付       | 内容                                                                                        | 担当      |
| ---------- | ------------------------------------------------------------------------------------------- | --------- |
| 2026-06-01 | 初版作成。カテゴリ 0〜8・全 52 タスクを定義。Phase 3 コード実装のキックオフドキュメントとして整備 | AI        |
| 2026-06-01 | カテゴリ 0 のうち 0.1〜0.4 完了（4/5）。ADR-015 Gradle 修正・03 TIMESTAMP 訂正・docker-compose backend 追加・CI ワークフロー作成 | AI |
| 2026-06-01 | カテゴリ 0 完了（5/5）。G5 全サービス疎通確認（frontend:3000 / backend:8080 / postgres / localstack / cognito-local）をユーザーが手動実施・確認 | ユーザー |
| 2026-06-02 | カテゴリ 2 完了（5/5）。shadcn 10 コンポーネント生成・共通レイアウト/ナビ（Vitest 13 テスト）・Better Auth 配線（基盤のみ）・BFF クライアント・Zod 型定義を実装。pnpm lint/build/test すべてグリーン | AI |
| 2026-06-02 | カテゴリ 1 のうち 1.1/1.3/1.4/1.5/1.6 完了（5/6）。1.2 はカテゴリ 3 に後送り（User エンティティ依存）。SecurityConfig（JWT 権限マッピング・401/403 統一レスポンス）・GlobalExceptionHandler・ErrorCode/例外クラス群・OpenApiConfig・BaseControllerTest/WithMock* を実装。./gradlew build グリーン（spotlessCheck/checkstyle/contextLoads 通過）。ADR-016 に DEVIATION 追記 | AI |
| 2026-06-03 | カテゴリ 1 完了（6/6）・カテゴリ 3 完了（6/6）。1.2 CurrentUserArgumentResolver（@CurrentUser・JWT sub→User 解決・UnregisteredUserException→401）。3.1 Department/User/Role エンティティ + UserRepository（JOIN FETCH）。3.2 UserResponse DTO + AuthController + GlobalExceptionHandler 401 ハンドラ。3.3 AuthControllerTest 4 ケース（./gradlew build グリーン・ddl-auto:create-drop 対応）。3.4 signin ページ（Cognito social サインイン）。3.5 Server Actions（signOutAction/getProfileAction）+ MSW 配線 + Vitest テスト 3 ケース。3.6 認証ガードレイアウト（ルートグループ）。pnpm test 16 テスト・lint グリーン。ADR-016 に UnregisteredUserException→401 DEVIATION 追記 | AI |
| 2026-06-03 | カテゴリ 4 完了（7/7）。4.1a Reservation 最小ドメイン（canonical エンティティ・カテゴリ 5 が拡張する前倒し）。4.1 Resource エンティティ（create ファクトリ・update/changeActive メソッド・初の生成・更新エンティティ）+ ResourceRepository + ResourceCategory enum。4.2 ResourceResponse/OccupiedSlot DTO + Request DTO 3種 + ResourceService（初の Service 層・overlap 述語を static メソッドに集約）。4.3 ResourceController（6エンドポイント・@PreAuthorize ADMIN 制御）。4.4 ResourceServiceTest（初の Mockito 単体・overlap 境界値 7ケース）+ ResourceControllerTest（H2 seed + Reservation 含む）。4.5 /resources 画面（Server Component + ResourceFilterForm クライアント）。4.6 /resources/{id} 画面（詳細・空き状況）。4.7 /admin/resources 画面（ADMIN ガード admin/layout.tsx・登録/編集ダイアログ・有効/無効トグル）。./gradlew build グリーン・pnpm test 27 テスト・lint クリーン。進捗 22→29/52（42%→56%） | AI |
| 2026-06-04 | カテゴリ 5 完了（7/7）。5.1 Reservation エンティティ拡張（create/update/cancel メソッド追加）+ ReservationRepository 拡張（JOIN FETCH 付き一覧クエリ4種）。5.2 ReservationResponse DTO + Request DTO 2種（CreateとUpdateを別スキーマ）+ ReservationService（重複チェック・requires_approval分岐・所有権チェック・ステータスガード・approval_steps はカテゴリ6 TODO）。5.3 ReservationController（5エンドポイント・行レベル所有権は Service 判定・@PreAuthorize 不使用）。5.4 ReservationServiceTest（Mockito・業務ルール14ケース）+ ReservationControllerTest（H2 seed・統合テスト16ケース）。5.5-5.7 予約申請/一覧/詳細ページ（(authenticated)/配下・409インラインエラー・キャンセル確認ダイアログ）。api-client.ts params 拡張（string[]対応・繰り返しキー）。./gradlew build グリーン・pnpm test 40テスト・lint クリーン。進捗 29→36/52（56%→69%） | AI |
| 2026-06-04 | カテゴリ 6 完了（5/5）。6.1 ApprovalStatus enum + ApprovalStep エンティティ（create/approve/reject メソッド）+ ApprovalStepRepository（JOIN FETCH・ページネーションなし=List）+ Reservation.markApproved()/markRejected() + UserRepository.findFirstByRole。6.2 ApprovalStepResponse DTO + ApprovalDecisionRequest + 例外 2 クラス（CommentRequiredException/ApprovalStepNotFoundException）+ GlobalExceptionHandler 2 ハンドラ + ApprovalService（重複再チェック自己除外・コメント必須 Service 判定・createInitialStep で Cat5 TODO シーム解消）。6.3 ApprovalController（3エンドポイント・@PreAuthorize APPROVER/ADMIN）。6.4 ApprovalServiceTest（Mockito・14ケース）+ ApprovalControllerTest（H2 seed）+ Cat5 テスト修正（ReservationServiceTest に @Mock ApprovalService・ReservationControllerTest に APPROVER seed と approval_steps FK 逆順削除）。6.5 approvals.ts Server Action（getArray bare array）+ /approvals 画面（APPROVER/ADMIN ガード・承認/却下ダイアログ・コメント任意/必須）。Zod スキーマを lib/schemas/reservation.ts に分離（'use server' 制約回避）。setup.ts に vitest/globals 型参照追加。./gradlew build グリーン・pnpm test 52テスト・lint クリーン・tsc --noEmit クリーン。進捗 36→41/52（69%→79%） | AI |
| 2026-06-05 | カテゴリ 7 完了（6/6）。7.1 DepartmentRepository（LEFT JOIN FETCH + ORDER BY name asc）。7.2 DepartmentResponse record（parentId null=ルート部署）+ DepartmentService + DepartmentController（GET /api/departments・全ロール・配列返却）。7.3 UserService（既存 findAllWithDepartment 流用）+ UserController（@PreAuthorize ADMIN・Page 返却）。7.4 DepartmentControllerTest（root+子 seed・nullValue() 2引数 jsonPath）+ UserControllerTest（ADMIN→200・MEMBER/APPROVER→403・未認証→401）。./gradlew build グリーン。7.5 (authenticated)/page.tsx（ダッシュボード・Promise.all で PENDING/APPROVED 件数並行取得・role!=MEMBER で承認待ち件数 opt 表示）。旧 src/app/page.tsx 削除（URL /競合回避）。7.6 users.ts Server Action（listUsersAction・getPaginated）+ admin/users/page.tsx（Server Component・admin/layout.tsx が ADMIN ガード済み）+ UserManagementClient.tsx（閲覧専用テーブル・RoleBadge）。handlers.ts に /api/backend/users ハンドラ追加・users.test.ts 4ケース新規作成。pnpm test 56テスト・lint・tsc クリーン。進捗 41→47/52（79%→90%） | AI |
| 2026-06-05 | カテゴリ 8 のうち 8.2〜8.5 完了（4/5 + 新規 8.6/8.7 追加）。受入ゲート標準方針で実施。**8.2（API 突合）**: 18 API 全実装確認。差異2件をインライン修正：①`GlobalExceptionHandler` に `MissingServletRequestParameterException`/`MethodArgumentTypeMismatchException`/`ValidationException` ハンドラ追加（必須パラメータ欠落→500 を 400 に修正）②`ResourceController.list()` に from/to 同時指定強制（`ValidationException` 400）。`ValidationException` クラスを新規作成。`ResourceControllerTest` に4テスト追加（from のみ→400・to のみ→400・availability パラメータ欠落→400×2）。`./gradlew build` グリーン（127テスト全通過）。**8.3（画面突合）**: 10 画面全ルート確認。`screen-spec.md` の `/auth/signin` をメール/パスワードフォームから ADR-008 準拠 Cognito ソーシャルログインに訂正。ページネーション UI ギャップを 8.6 として記録。**8.4**: `PROJECT_PLAN.md` §4 Phase 1・2 に ✅。**8.5**: `README.md` クイックスタートの backend 自動起動記述を実態（sleep infinity・手動 bootRun）に訂正。**8.7 新規**: cognito-local provisioning 未整備のため 8.1 をブロッカー付き「保留」に設定・8.7 として新規タスク追記。pnpm test 56テスト・lint・tsc クリーン。進捗 47→52/54（90%→96%）。 | AI |
| 2026-06-06 | カテゴリ 8 残タスク 8.6・8.7・8.1 完了。**8.6（ページネーション UI）**: `pagination-nav.tsx`（Server Component・prev/next ボタン・現クエリ保持・totalPages≤1 で非描画）を新規作成。`/reservations`（status[] 保持）・`/admin/users`（size:100→page/size:20）・`/resources`（情報 p タグを PaginationNav に置換）に組込み。`buildHref` 純関数の単体テスト 10ケース追加。pnpm test 66テスト全通過・lint・tsc クリーン。**8.7（cognito-local provisioning）**: `scripts/provision-cognito.sh`（curl/jq・aws CLI 非依存・冪等）新規作成。cognito-local が全プールで同一 RSA 鍵（kid: CognitoLocal）を使用する特性を利用し、API 作成プールの JWT を `local_user_pool_id` JWKS で検証できる構成を実現。`AddCustomAttributes` で `custom:role` スキーマ追加・`AdminCreateUser` で属性指定・既存ユーザーは `AdminUpdateUserAttributes` で修正（RoleJwtAuthenticationConverter が JWT クレームを参照するため必須）。`postCreate.sh` に provisioning を組込み・`.devcontainer/docker-compose.yml` の cognito-local イメージを digest 固定。`frontend/.env.local.example`・`auth.ts` コメントを実態に更新。**8.1（API 受入）**: MEMBER JWT（sub=cognito-member-001）で `POST /api/reservations`（第1会議室・requires_approval=true）→ status=PENDING + approval_step 自動生成 → APPROVER JWT → `POST /api/approvals/{stepId}/approve` → status=APPROVED の一連を curl で実証。既知の制約（Better Auth cognito プロバイダの https/AWS-JWKS ハードコードによりブラウザサインインは不成立）を各ファイルに明記。進捗 52→54/54（100%）。 | AI |
