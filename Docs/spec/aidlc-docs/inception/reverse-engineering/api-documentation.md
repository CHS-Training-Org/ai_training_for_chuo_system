# API Documentation

## REST APIs

### リソース一覧取得
- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧をページネーションで返す（全ロール・認証必須。ADMIN のみ `is_active=false` を含む）
- **Request**: クエリパラメータ `category`（任意）、`from` / `to`（任意・同時指定必須、空き確認フィルタ）、`page` / `size`（ページネーション、デフォルト `size=20`）
- **Response**: `Page<ResourceResponse>`

### リソース登録
- **Method**: POST
- **Path**: `/api/resources`
- **Purpose**: リソースを新規登録する（ADMIN のみ、`@PreAuthorize("hasRole('ADMIN')")`）
- **Request**: `CreateResourceRequest`（`name`・`category`・`capacity`・`location`・`requiresApproval`・`isActive`・`description`）
- **Response**: `ResourceResponse`（201 Created）

### リソース詳細取得
- **Method**: GET
- **Path**: `/api/resources/{id}`
- **Purpose**: 指定 ID のリソース詳細を返す（全ロール・認証必須）。**本課題 RES-02 でレスポンスに新フィールドを追加する対象**
- **Request**: パスパラメータ `id`（UUID）
- **Response**: `ResourceResponse`（404 Not Found の場合あり）

### リソース更新
- **Method**: PUT
- **Path**: `/api/resources/{id}`
- **Purpose**: リソース情報を全項目置換で更新する（ADMIN のみ）。**本課題 RES-03 でリクエストに新フィールドを追加する対象**
- **Request**: `UpdateResourceRequest`（`CreateResourceRequest` と同一フィールド構成）
- **Response**: `ResourceResponse`

### リソース有効/無効切替
- **Method**: PATCH
- **Path**: `/api/resources/{id}/status`
- **Purpose**: `is_active` のみを切り替える（ADMIN のみ）
- **Request**: `StatusUpdateRequest`（`isActive: boolean`）
- **Response**: `ResourceResponse`

### リソース空き照会
- **Method**: GET
- **Path**: `/api/resources/{id}/availability`
- **Purpose**: 指定期間内の占有済み予約スロットを返す（全ロール・認証必須）。空きスロットの算出はフロントエンド側の責務
- **Request**: パスパラメータ `id`、クエリパラメータ `from` / `to`（両方必須）
- **Response**: `OccupiedSlot[]`（`reservationId` / `startAt` / `endAt`）

### 他ドメインのエンドポイント（概要のみ）
- `UserController` - ユーザー管理（詳細はスコープ外のため未調査）
- `DepartmentController` - 部署管理
- `ReservationController` - 予約の申請・一覧・キャンセル
- `ApprovalController` - 予約承認・却下
- `AuthController` - 開発専用ロール別ログイン等（`NODE_ENV !== 'production'` 時のみ有効な `dev-auth` 系エンドポイントを含む）

## Internal APIs

### ResourceService
- **Methods**: `list(category, from, to, isAdmin, pageable)` / `get(id)` / `create(req)` / `update(id, req)` / `changeStatus(id, isActive)` / `availability(id, from, to)` / `static overlaps(start, end, from, to)`
- **Parameters**: 上記シグネチャ参照（`backend/.../application/ResourceService.java`）
- **Return Types**: `Page<ResourceResponse>` / `ResourceResponse` / `List<OccupiedSlot>` / `boolean`

### ResourceRepository（Spring Data JPA）
- **Methods**: `findByCategory(category, pageable)` / `findByIsActiveTrue(pageable)` / `findByCategoryAndIsActiveTrue(category, pageable)` および非ページネーション版（`fetchAllCandidates` 用）
- **Parameters**: `ResourceCategory` / `Pageable`
- **Return Types**: `Page<Resource>` / `List<Resource>`

## Data Models

### Resource（エンティティ）
- **Fields**: `id (UUID)` / `name (String, ≤100)` / `category (ResourceCategory)` / `capacity (Integer, nullable)` / `location (String, ≤200, nullable)` / `requiresApproval (boolean)` / `isActive (boolean)` / `description (String, TEXT, nullable)` / `createdAt (LocalDateTime)`
- **Relationships**: `Reservation.resource` から参照される（1対多、`FK fk_reservations_resource`）
- **Validation**: DB 制約 `chk_resources_category IN ('ROOM','EQUIPMENT','VEHICLE')`。DTO 側は Bean Validation（`@NotBlank` / `@Size` / `@NotNull`）

### ResourceResponse（DTO）
- **Fields**: `Resource` の全フィールドに対応する9フィールド（`category` は enum の文字列表現）
- **Relationships**: フロントエンドの `ResourceResponseSchema`（`frontend/src/lib/types/api.ts`）と同一フィールドセットを維持する必要がある
- **Validation**: なし（レスポンス専用）

### CreateResourceRequest / UpdateResourceRequest（DTO）
- **Fields**: `ResourceResponse` から `id` / `createdAt` を除いた7フィールド
- **Relationships**: フロントエンドの `CreateResourceSchema`（Zod、`frontend/src/lib/schemas/resource.ts`）と1対1対応
- **Validation**: `name` 必須・100文字以内、`category` 必須、`location` 200文字以内、`requiresApproval` / `isActive` 必須
