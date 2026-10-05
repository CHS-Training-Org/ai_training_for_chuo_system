# API Documentation

> **一次情報源**: `docs-next/docs/spec/api-spec.md`。本ファイルは本タスクの対象である `GET /api/resources` 周辺を中心に、既存エンドポイント一覧を要約する。

## REST APIs

### GET /api/resources（リソース一覧）

- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: カテゴリ・空き確認期間でリソースを絞り込んで一覧取得する（キーワード検索は未実装＝本タスクの対象）
- **Request**: クエリパラメータ `category`（任意: `ROOM`/`EQUIPMENT`/`VEHICLE`）、`from`/`to`（任意・同時指定必須、TIMESTAMP）、`page`/`size`（Pageable）
- **Response**: `Page<ResourceResponse>`（`id`, `name`, `category`, `capacity`, `location`, `requiresApproval`, `isActive`, `description`, `createdAt`）

> `from`/`to` 両方指定時のみ、当該期間に `status IN ('PENDING','APPROVED')` の予約があるリソースを除外する。片方のみ指定は `400 VALIDATION_ERROR`。ADMIN は `is_active=false` のリソースも含む。

### その他のリソース関連エンドポイント

- `GET /api/resources/{id}` - 詳細取得
- `GET /api/resources/{id}/availability` - 指定期間の空き確認
- `POST /api/resources` - 新規登録（ADMIN）
- `PUT /api/resources/{id}` - 更新（ADMIN）
- `PATCH /api/resources/{id}/status` - 有効/無効切替（ADMIN）

### その他ドメインのエンドポイント（概要、本タスク対象外）

- `ReservationController` - 予約の作成・一覧・詳細・承認依頼
- `ApprovalController` - 承認・却下
- `DepartmentController` - 部署一覧
- `UserController` - ユーザー一覧・更新
- `AuthController` - サインイン関連

詳細なリクエスト/レスポンス定義は `docs-next/docs/spec/api-spec.md` を参照。

## Internal APIs

### ResourceService（application 層）

- **Methods**:
  - `list(category, from, to, isAdmin, pageable): Page<Resource>`
  - `fetchAllCandidates(category, isAdmin): List<Resource>`
  - `get(id): Resource`
  - `create(...)` / `update(...)` / `changeStatus(...)`
  - `availability(id, from, to): boolean`
  - `static overlaps(reservation, from, to): boolean`
- **Parameters**: `category` は `null` 許容（未指定時は全カテゴリ）。`isAdmin` で `is_active=false` の可視性を切替
- **Return Types**: 一覧系は `Page<Resource>` または `List<Resource>`（`fetchAllCandidates` は空き確認用の全件取得）

### ResourceRepository（domain 層、派生クエリのみ）

```java
Page<Resource> findByIsActiveTrue(Pageable pageable);
List<Resource> findByIsActiveTrue();
Page<Resource> findByCategoryAndIsActiveTrue(ResourceCategory category, Pageable pageable);
List<Resource> findByCategoryAndIsActiveTrue(ResourceCategory category);
Page<Resource> findByCategory(ResourceCategory category, Pageable pageable);
List<Resource> findByCategory(ResourceCategory category);
```

> `keyword` 検索を追加する場合、この派生メソッド方式のままだと `category × isActive × keyword` の組み合わせ爆発が起きる点に注意（詳細は `code-quality-assessment.md` の技術的メモを参照）。

## Data Models

### Resource

- **Fields**: `id`(UUID) / `name`(VARCHAR(100), NOT NULL) / `category`(VARCHAR(20), NOT NULL, CHECK) / `capacity`(INTEGER, null可) / `location`(VARCHAR(200), null可) / `requiresApproval`(BOOLEAN) / `isActive`(BOOLEAN) / `description`(TEXT, null可) / `createdAt`(TIMESTAMP)
- **Relationships**: `Resource` 1 - N `Reservation`
- **Validation**: `category` は DB の CHECK 制約で `ROOM`/`EQUIPMENT`/`VEHICLE` に限定。`name`/`description` への検索用インデックスは現状なし
