# API Documentation

> 全 API の一覧は既存の [`docs-next/docs/spec/api-spec.md`](../../../../../docs-next/docs/spec/api-spec.md) を出典とする。ここでは今回のタスクに関わる `GET /api/resources` のみ記載する。

## REST APIs

### `GET /api/resources`（リソース一覧）
- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧の取得（カテゴリ・期間フィルタ、ページネーション）。ADMIN は inactive を含む。
- **Request**:
  - クエリパラメータ（現状）：`category`（任意）、`from`（任意・`to` と同時指定必須）、`to`（同上）、`page`（`@PageableDefault(size=20)`）
  - 今回追加：`keyword`（任意・`resources.name` / `resources.description` への部分一致・大文字小文字を区別しない）
- **Response**: `Page<ResourceResponse>`（`api-spec.md` §`GET /api/resources` 参照）

## Internal APIs

### `ResourceService#list`
- **Methods**: `list(ResourceCategory category, LocalDateTime from, LocalDateTime to, boolean isAdmin, Pageable pageable)`
- **Parameters**: `category`（null 可）、`from`/`to`（両方 null または両方指定）、`isAdmin`、`pageable`
- **Return Types**: `Page<ResourceResponse>`
- **今回の変更点**: シグネチャに `keyword`（`String`、null 可）を追加する必要がある（Requirements Analysis で確定）。

### `ResourceRepository`
- **Methods**: `findByIsActiveTrue(Pageable)`, `findByCategoryAndIsActiveTrue(ResourceCategory, Pageable)`, `findByCategory(ResourceCategory, Pageable)`, `findAll(Pageable)`（ページネーション有り版）と、それぞれの全件取得版（`from`/`to` フィルタ用）
- **Parameters**: 上記の組み合わせ（`category` 有無 × `isAdmin` 有無 × ページネーション有無）
- **今回の変更点**: `keyword` を組み合わせると分岐が倍増するため、`Specification`（JPA Criteria）への置き換えを検討する余地がある（AI 活用ポイント：設計判断の相談）。

## Data Models

### `Resource`（`resources` テーブル、V001 マイグレーション準拠）
- **Fields**: `id`（UUID）、`name`（VARCHAR(100)、必須）、`category`（VARCHAR(20)、enum 制約）、`capacity`（INTEGER、null可）、`location`（VARCHAR(200)、null可）、`requires_approval`（BOOLEAN）、`is_active`（BOOLEAN）、`description`（TEXT、null可）、`created_at`（TIMESTAMP）
- **Relationships**: `Reservation.resource_id` から参照される。
- **Validation**: `ddl-auto: validate` のため、エンティティとマイグレーションのカラム定義は完全一致が必須。keyword 検索は既存カラム（`name`/`description`）のみを対象とし、スキーマ変更は不要。
