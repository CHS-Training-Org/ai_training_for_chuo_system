# API Documentation

> 詳細な仕様（リクエスト/レスポンス例）は `docs-next/docs/spec/api-spec.md` を真実の源とする。本書はコードから読み取れる実装の実態を一覧化したもの。

## REST APIs

| メソッド | パス | 概要 | 認可 | 実装（Controller） |
|---|---|---|---|---|
| GET | `/api/users/me` | 自己情報取得 | 認証必須（全ロール） | `AuthController` |
| POST | `/api/auth/signout` | サインアウト通知 | 認証不要（`permitAll`） | `AuthController` |
| GET | `/api/users` | ユーザー一覧（ページング） | ADMIN専用 | `UserController` |
| GET | `/api/departments` | 部署一覧（全件） | 認証必須（全ロール） | `DepartmentController` |
| GET | `/api/resources` | リソース一覧（`category`/`from`/`to` フィルタ、ページング） | 認証必須（ADMINは無効リソースも含む） | `ResourceController` |
| POST | `/api/resources` | リソース登録 | ADMIN専用（201） | `ResourceController` |
| GET | `/api/resources/{id}` | リソース詳細 | 認証必須 | `ResourceController` |
| PUT | `/api/resources/{id}` | リソース更新 | ADMIN専用 | `ResourceController` |
| PATCH | `/api/resources/{id}/status` | 有効/無効切替 | ADMIN専用 | `ResourceController` |
| GET | `/api/resources/{id}/availability` | 占有スロット照会（`from`/`to`必須） | 認証必須 | `ResourceController` |
| GET | `/api/reservations` | 予約一覧（`status`フィルタ、ページング） | 認証必須（本人 or ADMIN全件） | `ReservationController` |
| POST | `/api/reservations` | 予約申請（201） | 認証必須（全ロール） | `ReservationController` |
| GET | `/api/reservations/{id}` | 予約詳細 | 本人 or APPROVER/ADMIN | `ReservationController` |
| PUT | `/api/reservations/{id}` | 予約更新（PENDINGのみ） | 申請者本人 | `ReservationController` |
| POST | `/api/reservations/{id}/cancel` | キャンセル | 本人 or ADMIN | `ReservationController` |
| GET | `/api/approvals/pending` | 承認待ち一覧（全件・非ページング） | APPROVER/ADMIN | `ApprovalController` |
| POST | `/api/approvals/{stepId}/approve` | 承認 | APPROVER/ADMIN（担当分のみ、ADMINは全件） | `ApprovalController` |
| POST | `/api/approvals/{stepId}/reject` | 却下（コメント必須） | APPROVER/ADMIN | `ApprovalController` |

**今回のエンハンス課題（Issue #23）の対象**: `GET /api/resources` に `keyword` クエリパラメータ（`resources.name`・`resources.description` への大文字小文字を区別しない部分一致）を追加する。既存の `category`/`from`/`to` とは AND 条件。

## Internal APIs（backend、Controller以外の主要インターフェース）

### `CurrentUserArgumentResolver implements HandlerMethodArgumentResolver`

- **Methods**: `supportsParameter(MethodParameter)`, `resolveArgument(...)`
- **Parameters**: `@CurrentUser` アノテーション付きの Controller メソッド引数
- **Return Types**: JWT の `sub` クレームから解決した `User` エンティティ

### `RegisteredUserInterceptor implements HandlerInterceptor`

- **Methods**: `preHandle(HttpServletRequest, HttpServletResponse, Object)`
- **Parameters**: 全 `/api/**`（`/api/auth/signout` を除く）
- **Return Types**: `boolean`（未登録ユーザーは401を書き込み `false` を返す）

### `RoleJwtAuthenticationConverter implements Converter<Jwt, Collection<GrantedAuthority>>`

- **Methods**: `convert(Jwt)`
- **Parameters**: Cognito JWT（`custom:role` クレーム）
- **Return Types**: `ROLE_MEMBER` / `ROLE_APPROVER` / `ROLE_ADMIN` のいずれかを含む権限コレクション

### `RestAuthenticationEntryPoint` / `RestAccessDeniedHandler`

- **Methods**: `commence(...)` / `handle(...)`
- **Purpose**: 401/403 の統一 JSON レスポンス（`{code, message}`）生成。Bean登録せず `SecurityConfig` 内で直接インスタンス化。

## Server Actions（frontend BFF層。実体は上記 REST API の呼び出し）

| Server Action | 呼び出し先 |
|---|---|
| `getProfileAction` / `signOutAction`（`auth.ts`） | `GET /api/users/me` / Better Auth 内部API |
| `devLoginAction`（`dev-auth.ts`） | cognito-local（`InitiateAuth`、開発専用） |
| `listReservationsAction` / `getReservationAction` / `createReservationAction` / `updateReservationAction` / `cancelReservationAction`（`reservations.ts`） | `/api/reservations*` |
| `listResourcesAction` / `getResourceAction` / `getAvailabilityAction` / `createResourceAction` / `updateResourceAction` / `changeResourceStatusAction`（`resources.ts`） | `/api/resources*` |
| `listPendingApprovalsAction` / `approveAction` / `rejectAction`（`approvals.ts`） | `/api/approvals*` |
| `listUsersAction`（`users.ts`） | `GET /api/users` |

## Data Models（JPAエンティティ、`domain/`）

### User

- **Fields**: id(UUID,PK), cognitoSub(unique), name, email(unique), department, role(Enum), createdAt
- **Relationships**: `@ManyToOne` → Department（LAZY）
- **Validation**: DB制約（unique, role CHECK）

### Department

- **Fields**: id(UUID,PK), name, parent
- **Relationships**: `@ManyToOne` → Department（自己参照、LAZY）
- **Validation**: なし（最小実装）

### Resource

- **Fields**: id(UUID,PK), name, category(Enum), capacity, location, requiresApproval(boolean), isActive(boolean), description, createdAt
- **Relationships**: なし（独立エンティティ）
- **Validation**: category CHECK制約
- **備考**: 今回のエンハンス課題で `name`・`description` へのキーワード検索を追加する対象。

### Reservation

- **Fields**: id(UUID,PK), resource, requester, startAt, endAt, purpose, attendeesCount, status(Enum), createdAt, updatedAt
- **Relationships**: `@ManyToOne` → Resource（LAZY）、`@ManyToOne` → User as requester（LAZY）
- **Validation**: status CHECK制約、`end_at > start_at` CHECK制約

### ApprovalStep

- **Fields**: id(UUID,PK), reservation, approver, stepOrder(固定1), status(Enum), comment, decidedAt, createdAt
- **Relationships**: `@ManyToOne` → Reservation（LAZY）、`@ManyToOne` → User as approver（LAZY）
- **Validation**: status CHECK制約
