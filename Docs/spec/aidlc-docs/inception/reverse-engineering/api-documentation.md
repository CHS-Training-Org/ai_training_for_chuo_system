# API Documentation

## REST APIs
### GET /api/resources
- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧（全ロール、認証必須。ADMIN は inactive を含む）
- **Request**: クエリ `category`（ROOM/EQUIPMENT/VEHICLE）、`from`/`to`（同時指定必須、片方のみは 400 VALIDATION_ERROR）、`page`（既定 0）、`size`（既定 20）。`keyword` は未実装
- **Response**: `Page<ResourceResponse>`（`content`、`totalElements`、`totalPages`、`number`、`size`、`first`、`last`）

## Internal APIs
### ResourceService.list
- **Methods**: `list(ResourceCategory category, LocalDateTime from, LocalDateTime to, boolean isAdmin, Pageable pageable)`
- **Return Types**: `Page<ResourceResponse>`

### listResourcesAction（FE）
- **Parameters**: `{ category?, from?, to?, page?, size? }`

## Data Models
### Resource
- **Fields**: id、name（必須・100 字）、category、capacity、location、requiresApproval、isActive、description（TEXT・null 可）、createdAt
- **Validation**: 登録・更新は `CreateResourceRequest` / `UpdateResourceRequest`
