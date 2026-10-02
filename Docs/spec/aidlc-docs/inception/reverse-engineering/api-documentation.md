# API Documentation

> エンドポイント全体の一覧・共通仕様（認証・エラー形式・ページネーション）は [`docs-next/docs/spec/api-spec.md`](../../../../docs-next/docs/spec/api-spec.md) が正。本ファイルは Issue #23 の対象である `GET /api/resources` に絞って現状を記載する。

## REST APIs

### `GET /api/resources`（現状）

- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧取得（カテゴリ・空き確認期間でフィルタ可）
- **Request**:

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `category` | `ResourceCategory`（`ROOM`/`EQUIPMENT`/`VEHICLE`） | ❌ | 完全一致フィルタ |
| `from` | `LocalDateTime` | ❌ | 空き確認開始日時（`to` と同時指定必須） |
| `to` | `LocalDateTime` | ❌ | 空き確認終了日時（`from` と同時指定必須） |
| `page` / `size` | integer | ❌ | ページネーション（Spring Data `Pageable`） |

- **Response**: `Page<ResourceResponse>`（`content` / `totalElements` / `totalPages` / `number` / `size` / `first` / `last`）

> **未対応**: `keyword` パラメータは現状受け付けていない。`ResourceController#list` に引数がなく、`ResourceFilterForm.tsx` にも入力欄がない。

## Internal APIs

### `ResourceService#list`

```java
Page<ResourceResponse> list(
    ResourceCategory category,
    LocalDateTime from,
    LocalDateTime to,
    boolean isAdmin,
    Pageable pageable)
```

- **Parameters**: `category`（null 可）／`from`・`to`（両方 null か両方非 null）／`isAdmin`（ロール判定済みフラグ）／`pageable`
- **Return Types**: `Page<ResourceResponse>`
- **分岐**: `from`/`to` が両方非 null なら `listWithAvailabilityFilter`（全件取得 → Java 側で重複予約を除外 → 手動ページネーション）、それ以外は `listPaginated`（DB 側でページネーション）

### `ResourceRepository`（該当メソッドのみ抜粋）

```java
Page<Resource> findByIsActiveTrue(Pageable pageable);
List<Resource> findByIsActiveTrue();
Page<Resource> findByCategoryAndIsActiveTrue(ResourceCategory category, Pageable pageable);
List<Resource> findByCategoryAndIsActiveTrue(ResourceCategory category);
Page<Resource> findByCategory(ResourceCategory category, Pageable pageable);
List<Resource> findByCategory(ResourceCategory category);
// findAll(Pageable) / findAll() は JpaRepository 標準メソッド
```

いずれも派生クエリメソッド名。`keyword` 条件を素朴に追加すると、ADMIN/非ADMIN（isActive 有無）× category 有無 × keyword 有無で最大 8 通りのメソッドが必要になる。

## Data Models

### Resource（エンティティ）

| フィールド | 型 | 検索対象 |
|---|---|---|
| `name` | `VARCHAR(100) NOT NULL` | ✅ 部分一致対象（RES-01） |
| `description` | `TEXT NULL` | ✅ 部分一致対象（RES-01）。**null 許容のため検索条件で null ガードが必要** |
| `category` | `VARCHAR(20) NOT NULL` | 既存の完全一致フィルタ（変更なし） |
| `isActive` | `BOOLEAN NOT NULL` | ロール別フィルタ（変更なし） |

- **Validation**: 現状の `Resource` エンティティにバリデーション制約なし（登録時は `CreateResourceRequest` 側で検証）。keyword 検索の追加によるエンティティ変更は不要（クエリ条件の追加のみ）。
