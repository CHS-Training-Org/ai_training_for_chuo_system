# API Documentation

## REST APIs

全エンドポイントは `/api` 配下。`/api/auth/signout` 以外は認証必須（Bearer JWT）。エラーは `{code, message}` 形式（401 は `RestAuthenticationEntryPoint`、403 は `RestAccessDeniedHandler` / `GlobalExceptionHandler`）。

### 予約一覧
- **Method**: GET
- **Path**: `/api/reservations`
- **Purpose**: 予約一覧。ADMIN は全件、MEMBER / APPROVER は本人分のみ（Service で判定）
- **Request**: クエリ `status`（`ReservationStatus`、複数指定可・任意）、`page`（既定 0）、`size`（既定 20）、`sort`（Spring Data 標準）。期間（`from` / `to`）の絞り込みはない
- **Response**: Spring Data `Page<ReservationResponse>`（JSON）

### 予約 その他
- `POST /api/reservations`（全ロール、201）/ `GET /api/reservations/{id}`（本人 or APPROVER / ADMIN）/ `PUT /api/reservations/{id}`（本人・PENDING のみ）/ `POST /api/reservations/{id}/cancel`（本人 or ADMIN）

### リソース
- `GET /api/resources`（`category` / `keyword` / `from`+`to` / `page` / `size`。ADMIN は inactive 含む）
- `POST /api/resources`、`PUT /api/resources/{id}`、`PATCH /api/resources/{id}/status`（いずれも `@PreAuthorize("hasRole('ADMIN')")`）
- `GET /api/resources/{id}`、`GET /api/resources/{id}/availability`

### 承認
- `GET /api/approvals/pending`、`POST /api/approvals/{stepId}/approve`、`POST /api/approvals/{stepId}/reject`（いずれも `@PreAuthorize("hasAnyRole('APPROVER','ADMIN')")`）

### ユーザー・部署・認証
- `GET /api/users`（`@PreAuthorize("hasRole('ADMIN')")`、ページネーション）
- `GET /api/users/me`（プロフィール。FE の `getProfileAction` が利用）
- `GET /api/departments`（全ロール）
- `POST /api/auth/signout`（認証不要）

### 帳票出力
- 該当エンドポイントなし。`text/csv` を返す API は存在しない（Issue #29 で `GET /api/reports/reservations/csv` を新設予定）

## Internal APIs

### ReservationService
- **Methods**: `list(User currentUser, Collection<ReservationStatus> statuses, Pageable pageable)`, `get(UUID, User)`, `create(CreateReservationRequest, User)`, `update(UUID, UpdateReservationRequest, User)`, `cancel(UUID, User)`
- **Return Types**: `Page<ReservationResponse>` / `ReservationResponse`

### ReservationRepository
- **Methods**: `findAllFetch(Pageable)`, `findByStatusInFetch(Collection<ReservationStatus>, Pageable)`, `findByRequesterIdFetch(UUID, Pageable)`, `findByRequesterIdAndStatusInFetch(UUID, Collection<ReservationStatus>, Pageable)`, `findByResource_IdAndStatusIn(...)`, `findByResource_IdInAndStatusIn(...)`
- **Parameters**: 一覧用 4 本は resource と requester を JOIN FETCH し、countQuery を別定義

### api-client.ts（frontend BFF）
- **Methods**: `get` / `getPaginated` / `getArray` / `post` / `put` / `patch` / `postEmpty`
- **Return Types**: いずれもレスポンスを JSON として Zod 検証した値（`postEmpty` は void）。非 2xx は `ApiClientError(code, message, status)`

## Data Models

### Reservation（`reservations` テーブル）
- **Fields**: id (UUID), resource_id, requester_id, start_at (TIMESTAMP), end_at (TIMESTAMP), purpose (VARCHAR 255), attendees_count (NULL 可), status (VARCHAR 20), created_at, updated_at
- **Relationships**: resource（ManyToOne LAZY）、requester → users（ManyToOne LAZY）
- **Validation**: `chk_reservations_status`（5 値）、`chk_reservations_time`（end_at > start_at）。インデックスは resource_id / requester_id / status（start_at には無し）

### ReservationResponse（DTO）
- **Fields**: id, resourceId, resourceName, requesterId, requesterName, startAt, endAt, purpose, attendeesCount, status, createdAt, updatedAt
- **Relationships**: `resourceName` / `requesterName` は LAZY 関連から取得するため、トランザクション内で生成する必要がある

### User（`users` テーブル）
- **Fields**: id, cognito_sub, name (VARCHAR 100), email, department_id, role (MEMBER / APPROVER / ADMIN), created_at
