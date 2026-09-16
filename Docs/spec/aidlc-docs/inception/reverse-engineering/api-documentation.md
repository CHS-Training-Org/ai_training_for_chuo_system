# API Documentation

> スコープ注記：全エンドポイントの網羅的な仕様は `docs-next/docs/spec/api-spec.md`（API 仕様）が真実の源である。本ファイルは本課題に関係するエンドポイントと内部インターフェースのみを扱う。

## REST APIs

### リソース一覧

- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧を返す。本課題の変更対象。
- **Request**: クエリパラメータ

  | パラメータ | 型 | 必須 | 説明 |
  |---|---|---|---|
  | `category` | string | 任意 | `ROOM` / `EQUIPMENT` / `VEHICLE` |
  | `from` | TIMESTAMP | 任意 | 空き確認の開始日時（`to` と同時指定必須） |
  | `to` | TIMESTAMP | 任意 | 空き確認の終了日時（`from` と同時指定必須） |
  | `page` | integer | 任意 | ページ番号（デフォルト 0） |
  | `size` | integer | 任意 | 件数（デフォルト 20） |

- **Response**: `Page<ResourceResponse>`（`content` / `totalElements` / `totalPages` / `number` / `size` / `first` / `last`）
- **認可**: 認証必須・全ロール。ADMIN は `isActive = false` を含む。
- **エラー**: `from` / `to` の片方のみ指定は `400 Bad Request`（`code: VALIDATION_ERROR`）。

### リソース詳細

- **Method**: GET
- **Path**: `/api/resources/{id}`
- **Purpose**: 単一リソースを返す。存在しない場合 `404 Not Found`。

### 空き状況照会

- **Method**: GET
- **Path**: `/api/resources/{id}/availability`
- **Purpose**: 指定期間の占有スロットを返す。`from` / `to` は必須。

### リソース登録・更新・ステータス切替（ADMIN）

- `POST /api/resources`（201 Created）
- `PUT /api/resources/{id}`
- `PATCH /api/resources/{id}/status`

いずれも `@PreAuthorize("hasRole('ADMIN')")` で保護される。本課題では変更しない。

## Internal APIs

### `ResourceService`

| メソッド | シグネチャ | 説明 |
|---|---|---|
| `list` | `Page<ResourceResponse> list(ResourceCategory, LocalDateTime from, LocalDateTime to, boolean isAdmin, Pageable)` | 一覧。`from` と `to` の有無で内部の2経路に分岐する |
| `get` | `ResourceResponse get(UUID)` | 詳細 |
| `create` | `ResourceResponse create(CreateResourceRequest)` | 登録 |
| `update` | `ResourceResponse update(UUID, UpdateResourceRequest)` | 更新 |
| `changeStatus` | `ResourceResponse changeStatus(UUID, boolean)` | 有効無効切替 |
| `availability` | `List<OccupiedSlot> availability(UUID, LocalDateTime, LocalDateTime)` | 占有スロット |
| `overlaps` | `static boolean overlaps(LocalDateTime, LocalDateTime, LocalDateTime, LocalDateTime)` | 半開区間の重複判定 |

`list` の内部分岐は本課題で重要な構造である。

- `from` と `to` がいずれも null：`listPaginated` が DB 側でページネーションする。
- `from` と `to` が指定あり：`fetchAllCandidates` が全件を取得し、Java 側で占有判定してから手動ページネーションする。

キーワード条件は、この**両方の経路**に適用しなければ「カテゴリ・期間フィルタとキーワードを同時に指定できる」という受入条件を満たさない。

### `ResourceRepository`

`JpaRepository<Resource, UUID>` を継承し、以下の派生クエリを持つ。

| メソッド | 戻り値 | 用途 |
|---|---|---|
| `findByIsActiveTrue(Pageable)` | `Page<Resource>` | 非 ADMIN・カテゴリ指定なし・ページ有 |
| `findByIsActiveTrue()` | `List<Resource>` | 同上・ページ無（空きフィルタ用） |
| `findByCategoryAndIsActiveTrue(ResourceCategory, Pageable)` | `Page<Resource>` | 非 ADMIN・カテゴリ指定あり・ページ有 |
| `findByCategoryAndIsActiveTrue(ResourceCategory)` | `List<Resource>` | 同上・ページ無 |
| `findByCategory(ResourceCategory, Pageable)` | `Page<Resource>` | ADMIN・カテゴリ指定あり・ページ有 |
| `findByCategory(ResourceCategory)` | `List<Resource>` | 同上・ページ無 |

ADMIN かつカテゴリ指定なしの経路は `JpaRepository` 既定の `findAll` を使う。

### フロントエンド Server Actions

| 関数 | シグネチャ | 説明 |
|---|---|---|
| `listResourcesAction` | `(params?: ListResourcesParams)` | 一覧取得。`category` / `from` / `to` / `page` / `size` をクエリに変換する |
| `getResourceAction` | `(id: string)` | 詳細取得 |
| `getAvailabilityAction` | `(id, from, to)` | 空き状況取得 |
| `createResourceAction` / `updateResourceAction` / `changeResourceStatusAction` | — | ADMIN 用 |

## Data Models

### `Resource`

- **Fields**: `id`（UUID）、`name`（varchar 100・NOT NULL）、`category`（varchar 20・NOT NULL）、`capacity`（integer・null 可）、`location`（varchar 200・null 可）、`requiresApproval`（boolean・NOT NULL）、`isActive`（boolean・NOT NULL）、`description`（TEXT・null 可）、`createdAt`（timestamp・NOT NULL）
- **Relationships**: `Reservation` が `resource_id` で参照する。
- **Validation**: `Resource.create` ファクトリ経由で生成する。コンストラクタは protected。
- **本課題との関係**: 検索対象は `name` と `description`。`description` は null を取りうるため、部分一致条件で null 行が落ちないよう注意が必要。

### `ResourceResponse`

`Resource` の全フィールドをそのまま外部公開する DTO。本課題では変更しない。
