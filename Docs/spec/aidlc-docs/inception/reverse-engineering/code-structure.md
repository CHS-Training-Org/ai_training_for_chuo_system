# Code Structure

## Build System

### frontend

- **Type**: pnpm（`pnpm@11.5.0`、`pnpm-workspace.yaml` あり）
- **Configuration**: `frontend/package.json`（scripts: dev/build/test/test:e2e/lint/format/format:check）、`components.json`（shadcn/ui: style=default, rsc=true, baseColor=neutral）、`oxlint.json`（プラグイン: react/nextjs/typescript）

### backend

- **Type**: Gradle（Kotlin DSL）、単一モジュール（マルチモジュールではない）
- **Configuration**: `backend/build.gradle.kts`、`backend/settings.gradle.kts`（`rootProject.name = "bookflow"`）、Gradle wrapper 9.5.1（`backend/gradle/wrapper/gradle-wrapper.properties`）
- **補足**: リポジトリルートに統合ビルド定義（package.json 等のモノレポツール）は存在しない。`frontend`（pnpm）・`backend`（Gradle）・`docs-next`（npm/Docusaurus）はそれぞれ独立したビルドシステムを持つ「ワンリポジトリに集約されたポリレポ」構成。

## Key Classes/Modules

### Module Hierarchy（概略）

```
frontend/src/
  app/                    ページ・レイアウト（App Router）
  components/
    layout/               Header・SideNav・ロール別メニュー
    ui/                   shadcn/ui ベースの汎用コンポーネント
  server/actions/         Server Actions（BFF層、ドメイン別）
  lib/
    types/                Zod による API 型定義
    schemas/              フォーム入力用 Zod スキーマ
    auth.ts / auth-client.ts / session.ts   Better Auth 関連
    api-client.ts         BFF共通HTTPクライアント
    labels.ts / utils.ts  表示ラベル・ユーティリティ

backend/src/main/java/com/example/bookflow/
  presentation/           Controller（6）
    dto/                  Request/Response DTO（12）
    exception/             例外→HTTPレスポンス変換
  application/            Service（5）
    exception/             業務例外・エラーコード（8）
  domain/                 Entity（5）・Repository（5）・Enum（3）
  infrastructure/
    config/               Spring Bean定義（3）
    security/             Spring Security・JWT関連（7）
  BookflowApplication.java  エントリポイント
```

### Existing Files Inventory

#### frontend/src/app（画面）

- `layout.tsx` - ルートレイアウト（フォント、Toaster）
- `globals.css` - Tailwind v4 `@theme inline` + shadcn/ui トークン
- `api/auth/[...all]/route.ts` - Better Auth の Route Handler
- `auth/signin/page.tsx` - サインイン画面
- `(authenticated)/layout.tsx` - 認証ガード＋Header/SideNav描画
- `(authenticated)/page.tsx` - ダッシュボード
- `(authenticated)/admin/layout.tsx` - ADMIN ガード（403インライン表示）
- `(authenticated)/admin/resources/page.tsx`, `ResourceManagementClient.tsx` - リソース管理（ADMIN専用）
- `(authenticated)/admin/users/page.tsx`, `UserManagementClient.tsx` - ユーザー管理（ADMIN専用・閲覧のみ）
- `(authenticated)/approvals/page.tsx`, `ApprovalTable.tsx` - 承認待ち一覧（APPROVER/ADMIN限定）
- `(authenticated)/reservations/page.tsx` - マイ予約一覧
- `(authenticated)/reservations/new/page.tsx`, `ReservationForm.tsx` - 予約申請フォーム
- `(authenticated)/reservations/[id]/page.tsx`, `CancelButton.tsx` - 予約詳細・キャンセル
- `(authenticated)/reservations/[id]/edit/page.tsx`, `ReservationEditForm.tsx` - 予約編集（PENDINGのみ）
- `(authenticated)/resources/page.tsx`, `ResourceFilterForm.tsx` - リソース一覧・フィルタ（今回のエンハンス課題の対象）
- `(authenticated)/resources/[id]/page.tsx` - リソース詳細・空き状況

#### frontend/src/components

- `layout/Header.tsx` - ユーザー名・ロールバッジ・サインアウトボタン
- `layout/SideNav.tsx` - ロール別メニュー描画
- `layout/nav-items.ts` - `navItemsForRole()` 純関数（ロール→メニュー項目）
- `ui/*.tsx`（badge/button/card/dialog/form/input/label/pagination-nav/select/sonner/table/textarea） - shadcn/ui ベースの汎用プレゼンテーショナルコンポーネント

#### frontend/src/server/actions（BFF層）

- `auth.ts` - `signOutAction`, `getProfileAction`
- `dev-auth.ts` - `devLoginAction`（開発専用ロールログイン）
- `reservations.ts` - 予約一覧/詳細/作成/更新/キャンセル
- `resources.ts` - リソース一覧/詳細/空き状況/登録/更新/有効無効切替（今回のエンハンス課題の対象）
- `approvals.ts` - 承認待ち一覧/承認/却下
- `users.ts` - ユーザー一覧（ADMIN専用）

#### frontend/src/lib

- `api-client.ts` - BFF共通HTTPクライアント（サーバー/ブラウザでURL分岐、Zod検証）
- `auth.ts` / `auth-client.ts` - Better Auth サーバー/クライアントインスタンス
- `session.ts` - `getSession()`/`getAccessToken()`（開発用Cookie優先ロジック）
- `labels.ts` - 表示ラベル定数（ROLE/RESERVATION_STATUS/RESOURCE_CATEGORY）
- `utils.ts` - `cn()`
- `types/enums.ts`, `types/api.ts`, `types/index.ts` - Zod による型定義
- `schemas/reservation.ts`, `schemas/resource.ts` - フォーム入力バリデーション用 Zod スキーマ（今回のエンハンス課題の対象）

#### backend/domain（5エンティティ・5Repository・3Enum）

- `User.java` / `UserRepository.java` / `Role.java`
- `Department.java` / `DepartmentRepository.java`
- `Resource.java` / `ResourceRepository.java` / `ResourceCategory.java`（今回のエンハンス課題の対象）
- `Reservation.java` / `ReservationRepository.java` / `ReservationStatus.java`
- `ApprovalStep.java` / `ApprovalStepRepository.java` / `ApprovalStatus.java`
- `BookflowApplication.java` - Spring Boot エントリポイント

#### backend/application（5Service・8例外）

- `ReservationService.java` - 予約ユースケース中核
- `ResourceService.java` - リソースCRUD・空き照会・重複判定（今回のエンハンス課題の対象）
- `ApprovalService.java` - 承認ワークフロー
- `UserService.java` - ADMIN向けユーザー一覧
- `DepartmentService.java` - 部署一覧
- `exception/BusinessException.java`, `ErrorCode.java`, `ReservationConflictException.java`, `ResourceNotFoundException.java`, `ApprovalStepNotFoundException.java`, `CommentRequiredException.java`, `UnregisteredUserException.java`, `ValidationException.java`

#### backend/presentation（6Controller・12DTO・2例外変換）

- `AuthController.java`, `UserController.java`, `DepartmentController.java`
- `ResourceController.java`（今回のエンハンス課題の対象）, `ReservationController.java`, `ApprovalController.java`
- `dto/*Request.java`（8種）, `dto/*Response.java`（4種）+ `OccupiedSlot.java`
- `exception/ErrorResponse.java`, `exception/GlobalExceptionHandler.java`

#### backend/infrastructure（3config・7security）

- `config/OpenApiConfig.java`, `config/RequestLoggingConfig.java`, `config/WebMvcConfig.java`
- `security/SecurityConfig.java`, `CurrentUser.java`, `CurrentUserArgumentResolver.java`, `RegisteredUserInterceptor.java`, `RoleJwtAuthenticationConverter.java`, `RestAuthenticationEntryPoint.java`, `RestAccessDeniedHandler.java`

## Design Patterns

### Repository パターン（backend）

- **Location**: `domain/*Repository.java`（Spring Data JPA `JpaRepository` 継承）
- **Purpose**: 永続化の抽象化。
- **Implementation**: `ResourceRepository.findByIdForUpdate` のような悲観ロック付きクエリ、JOIN FETCH によるN+1回避を各所で明示的に使用。

### ファクトリメソッド＋カプセル化された状態遷移（backend）

- **Location**: `domain/*.java` 各エンティティ
- **Purpose**: setter を持たせず、意図の明確なメソッド（`create`/`update`/`cancel`/`approve`/`reject`）でのみ状態変更させる。
- **Implementation**: `protected` デフォルトコンストラクタ + `public static create(...)`。

### 手書き DTO マッピング（backend）

- **Location**: `presentation/dto/*Response.java`
- **Purpose**: MapStruct 等を使わず、各 DTO（record）に静的ファクトリ `from(entity)` を実装して変換する。
- **Implementation**: エンティティ→DTO変換をレスポンスDTO自身に閉じ込める。

### Server Components 優先 + Server Actions（BFF）パターン（frontend）

- **Location**: `src/app/**/page.tsx`（データ取得）、`src/server/actions/*.ts`（BFF呼び出し）
- **Purpose**: CLAUDE.md の規約どおり Server Components を優先し、クライアント状態を最小化する。
- **Implementation**: ページで `await`/`Promise.all` による並行データ取得、インタラクティブ部分のみ `"use client"` 分離。

### React Hook Form + Zod パターン（frontend）

- **Location**: `src/app/**/*Form.tsx`、`src/lib/schemas/*.ts`
- **Purpose**: フォーム入力バリデーションの統一。
- **Implementation**: `"use server"` ファイルは Zod スキーマを export できない制約のため、スキーマを `lib/schemas/` に分離し、`.refine()` によるクロスフィールドバリデーションをクライアント側に追加。

## Critical Dependencies

### backend

- **Spring Boot**: 4.0.6（BOM でバージョン統一）
- **spring-boot-flyway**: Boot 4.0 で Flyway 自動構成が別モジュール分離されたため明示追加
- **springdoc-openapi-starter-webmvc-ui**: 3.0.1（ADR-015）
- **Lombok**: 1.18.38
- **H2**: テスト専用インメモリDB（ADR-018）

### frontend

- **Next.js**: ^15.3.2 / **React**: ^19.1.0
- **better-auth**: ^1.2.7（コード内コメントは1.6.11系挙動を前提）
- **zod**: ^3.25.76 / **react-hook-form**: ^7.76.1
- **tailwindcss**: ^4.1.8（v4、`@theme inline` 構文）
- **zustand**: ^5.0.3（依存関係のみ、コード内での使用箇所は確認できず）
