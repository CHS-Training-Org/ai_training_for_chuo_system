# API Documentation

## REST APIs

### リソース一覧
- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧（全ロール・認証必須。ADMIN は inactive 含む）
- **Request**: クエリ `category`（任意）, `from`/`to`（同時指定必須・片方のみは 400）, `page`（既定 0）, `size`（既定 20）。**`keyword` は未対応**
- **Response**: Spring Data `Page<ResourceResponse>`

### その他
- `POST /api/resources`（ADMIN）/ `GET /api/resources/{id}` / `PUT /api/resources/{id}`（ADMIN）/ `PATCH /api/resources/{id}/status`（ADMIN）/ `GET /api/resources/{id}/availability`

## Internal APIs

### ResourceService
- **Methods**: `list(category, from, to, isAdmin, pageable)`, `get`, `create`, `update`, `changeStatus`, `availability`, `static overlaps`
- **Return Types**: `Page<ResourceResponse>` 等

### ResourceRepository
- **Methods**: `findByIsActiveTrue`, `findByCategoryAndIsActiveTrue`, `findByCategory`（各 Pageable 版 + List 版）、`findByIdForUpdate`

## Data Models

### Resource（`resources` テーブル）
- **Fields**: id, name, category, capacity, location, requires_approval, is_active, description, created_at
- **Validation**: category は CHECK 制約（ROOM / EQUIPMENT / VEHICLE）
