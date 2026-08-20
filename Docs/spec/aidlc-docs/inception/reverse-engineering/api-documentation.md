---
type: note
title: API Documentation（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成したリソースAPIの現状仕様
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-08-07
---

# API Documentation

## REST APIs

### GET /api/resources

- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧のページング取得（カテゴリ・空き確認期間で絞り込み可能）
- **Request**: クエリパラメータ `category`（任意）、`from`/`to`（任意、両方指定時のみ空き確認フィルタが有効）、`page`/`size`（`Pageable` の標準パラメータ）。**`sort` パラメータは現状 API 仕様書（`Docs/spec/api-spec.md`）に記載がなく、`ResourceController` 側でも明示的なハンドリングがない**
- **Response**: `Page<ResourceResponse>`（`content`, `totalElements`, `totalPages` 等の Spring Data 標準ページング形式）

### その他のリソースAPI（変更対象外）

- `POST /api/resources`（ADMIN限定、新規作成）
- `GET /api/resources/{id}`（詳細取得）
- `PUT /api/resources/{id}`（ADMIN限定、更新）
- `PATCH /api/resources/{id}/status`（ADMIN限定、有効/無効切替）
- `GET /api/resources/{id}/availability`（空き状況確認）

## Internal APIs

### ResourceService

- **Methods**: `list(ResourceCategory, LocalDateTime, LocalDateTime, Pageable, User)`
- **Parameters**: `category`（null許容）、`from`/`to`（null許容、片方のみの指定は不可）、`pageable`（ページ・サイズ・ソートを内包）、`currentUser`（権限判定：ADMIN以外は `isActive=true` のみ）
- **Return Types**: `Page<Resource>`

## Data Models

### ResourceResponse（DTO）

- **Fields**: `id`, `name`, `category`, `capacity`, `location`, `requiresApproval`, `isActive`, `description`, `createdAt`（`Resource` エンティティのフィールドに1対1対応）
- **Relationships**: なし（単独リソース、予約とは別レスポンス）
- **Validation**: リクエストDTO（`CreateResourceRequest`等）側でのみ Bean Validation を使用。一覧取得の `sort` パラメータに対するバリデーション（許可フィールド外の指定時の挙動）は現状未定義であり、issue #22 の実装時に決める必要がある
