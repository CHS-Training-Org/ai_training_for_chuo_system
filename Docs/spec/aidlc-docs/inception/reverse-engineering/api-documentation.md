# API Documentation

## REST APIs
### GET /api/resources
- **Purpose**: リソース一覧（全ロール）。ADMIN は inactive 含む。
- **Request**: `category`, `from`, `to`（from/to は同時指定必須。違反は ValidationException）, `page`, `size`（既定 20）
- **Response**: `Page<ResourceResponse>`
- **Note**: `keyword` は未実装（本課題で追加予定）。詳細は `docs-next/docs/spec/api-spec.md`。

## Data Models
### Resource
- **Fields**: id, name, category, capacity, location, requiresApproval, isActive, description, createdAt
- **Validation**: name は必須で 100 文字以内。description は TEXT で NULL 可。
