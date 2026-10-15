# API Documentation

## REST APIs

### リソース一覧
- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧（全ロール・認証必須。ADMIN は `is_active = false` も含む）
- **Request**: クエリ `category`（`ROOM` / `EQUIPMENT` / `VEHICLE`）、`from` / `to`（`LocalDateTime`、同時指定必須。片方のみは 400 `VALIDATION_ERROR`）、`page`、`size`（デフォルト 20）。`keyword` は未実装
- **Response**: Spring Data `Page<ResourceResponse>`（`content` / `totalElements` / `totalPages` / `number` / `size` / `first` / `last`）

### その他
- `POST /api/resources`（ADMIN）、`GET /api/resources/{id}`、`PUT /api/resources/{id}`（ADMIN）、`PATCH /api/resources/{id}/status`（ADMIN）、`GET /api/resources/{id}/availability`

## Internal APIs

### ResourceService
- **Methods**: `Page<ResourceResponse> list(ResourceCategory category, LocalDateTime from, LocalDateTime to, boolean isAdmin, Pageable pageable)`
- **Parameters**: `isAdmin` が true のとき inactive を含める
- **Return Types**: `Page<ResourceResponse>`

### ResourceRepository
- **Methods**: `findByIsActiveTrue(Pageable)` / `findByIsActiveTrue()` / `findByCategoryAndIsActiveTrue(category, Pageable)` / `findByCategoryAndIsActiveTrue(category)` / `findByCategory(category, Pageable)` / `findByCategory(category)`、`findAll(Pageable)` / `findAll()`（`JpaRepository`）

## Data Models

### Resource（`resources` テーブル）
- **Fields**: `id` UUID、`name` VARCHAR(100) NOT NULL、`category` VARCHAR(20) NOT NULL、`capacity` INTEGER、`location` VARCHAR(200)、`requires_approval` BOOLEAN、`is_active` BOOLEAN、`description` TEXT、`created_at` TIMESTAMP
- **Relationships**: `reservations.resource_id` から参照される
- **Validation**: `category` は CHECK 制約で 3 値のみ。`ddl-auto: validate` のため、スキーマ変更は Flyway 経由
