# API Documentation（Resource ドメインに限定）

## REST APIs

### リソース一覧取得

- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: カテゴリ・空き確認期間・キーワードでの絞り込み一覧取得。
- **Request**: クエリパラメータ `category`/`from`/`to`/`keyword`/`sort`/`page`/`size`（任意）。
- **Response**: `Page<ResourceResponse>`。

### リソース登録

- **Method**: POST
- **Path**: `/api/resources`
- **Purpose**: 新規リソース登録（ADMIN のみ）。
- **Request**: `CreateResourceRequest`（`name`/`category`/`capacity`/`location`/`requiresApproval`/`isActive`/`description`）。
- **Response**: `ResourceResponse`（201 Created）。

### リソース詳細取得

- **Method**: GET
- **Path**: `/api/resources/{id}`
- **Purpose**: 単一リソースの詳細取得（全ロール）。
- **Request**: なし。
- **Response**: `ResourceResponse`（404 の場合は `ResourceNotFoundException` → 404）。

### リソース更新

- **Method**: PUT
- **Path**: `/api/resources/{id}`
- **Purpose**: リソース全フィールドの置換更新（ADMIN のみ）。
- **Request**: `UpdateResourceRequest`（`CreateResourceRequest` と同一フィールド構成）。
- **Response**: `ResourceResponse`。

### リソース有効/無効切替

- **Method**: PATCH
- **Path**: `/api/resources/{id}/status`
- **Purpose**: `isActive` のみを切り替える（ADMIN のみ）。
- **Request**: `StatusUpdateRequest`（`isActive: boolean`）。
- **Response**: `ResourceResponse`。

### 空き状況照会

- **Method**: GET
- **Path**: `/api/resources/{id}/availability`
- **Purpose**: 指定期間の占有済みスロット一覧取得。
- **Request**: `from`/`to`（必須）。
- **Response**: `OccupiedSlot[]`。

## Data Models

### `Resource`（エンティティ）

- **Fields**: `id`・`name`・`category`・`capacity`・`location`・`requiresApproval`・`isActive`・`description`・`createdAt`（既存9フィールド）。Issue #25 でここに `equipment`・`notes` を追加する想定（要件シート RES-01 参照）。
- **Relationships**: `Reservation` から `resource_id` で参照される（FK）。
- **Validation**: Bean Validation は DTO 層（`CreateResourceRequest`/`UpdateResourceRequest`）で実施。エンティティ自体にはバリデーション注釈なし。

### `ResourceResponse`（DTO, record）

- **Fields**: `Resource` の全フィールドを1:1でミラー。
- **Relationships**: `ResourceResponse.from(Resource)` で変換。

### `CreateResourceRequest` / `UpdateResourceRequest`（DTO, record）

- **Fields**: `name`（必須・最大100文字）・`category`（必須）・`capacity`（任意）・`location`（任意・最大200文字）・`requiresApproval`（必須）・`isActive`（必須）・`description`（任意）。
- **Validation**: Jakarta Bean Validation（`@NotBlank`/`@NotNull`/`@Size`）。
