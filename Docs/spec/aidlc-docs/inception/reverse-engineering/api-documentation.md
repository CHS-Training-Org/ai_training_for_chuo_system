---
type: working-doc
title: API Documentation（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成するAPI資料（今回のスコープ：リソース一覧取得API）
timestamp: 2026-09-29
---

# API Documentation

> 全体のAPI仕様は `docs-next/docs/spec/api-spec.md` が真実の源。ここでは今回変更対象の1エンドポイントのみを記録する。

## REST APIs

### リソース一覧取得（現状、`keyword` パラメータなし）
- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: カテゴリ・空き期間で絞り込んだリソース一覧をページング取得する
- **Request**:

  | パラメータ | 型 | 必須 | 説明 |
  |---|---|---|---|
  | category | string | ❌ | `ROOM` / `EQUIPMENT` / `VEHICLE` |
  | from | TIMESTAMP | ❌ | from/to は同時指定必須 |
  | to | TIMESTAMP | ❌ | 同上 |
  | page | integer | ❌ | デフォルト0 |
  | size | integer | ❌ | デフォルト20 |

  - `from`/`to` 指定時は、該当時間帯に `PENDING`/`APPROVED` 予約があるリソースを除外する
  - ADMIN のみ `is_active=false` のリソースも取得できる
  - 権限：全ロールでアクセス可能

- **Response**: Spring Data `Page<ResourceResponse>` 形式
  ```json
  {
    "content": [
      {
        "id": "uuid",
        "name": "string",
        "category": "ROOM|EQUIPMENT|VEHICLE",
        "capacity": 0,
        "location": "string",
        "requiresApproval": true,
        "isActive": true,
        "description": "string",
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "totalElements": 0,
    "totalPages": 0,
    "number": 0,
    "size": 20,
    "first": true,
    "last": true
  }
  ```

## Internal APIs

### `ResourceService`
- **Methods**:
  - `list(category, from, to, isAdmin, pageable): Page<Resource>`
  - `listPaginated(category, isAdmin, pageable): Page<Resource>`（from/to 未指定時）
  - `listWithAvailabilityFilter(category, from, to, isAdmin, pageable): Page<Resource>`（from/to 指定時）
- **Parameters**: `category`（nullable）、`from`/`to`（nullable、同時指定）、`isAdmin`（boolean）、`pageable`
- **Return Types**: いずれも `Page<Resource>`

## Data Models

### Resource（エンティティ）
- **Fields**: `id(UUID)`, `name(String)`, `category(ResourceCategory)`, `capacity(Integer, nullable)`, `location(String, nullable)`, `requiresApproval(boolean)`, `isActive(boolean)`, `description(String, nullable)`, `createdAt(Instant)`
- **Relationships**: `Reservation` から参照される（1対多）
- **Validation**: `category` は DB CHECK 制約で `ROOM`/`EQUIPMENT`/`VEHICLE` のみ許可

### ResourceResponse（DTO）
- **Fields**: `Resource` と同一フィールド構成（record + `from()` ファクトリメソッド）
- **Relationships**: なし
- **Validation**: なし（Entityからの変換のみ）
