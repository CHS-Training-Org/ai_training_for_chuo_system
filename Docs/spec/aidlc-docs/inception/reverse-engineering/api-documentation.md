---
type: spec
title: API Documentation（Reverse Engineering・現状のGET /api/resources）
description: resource-list-filter エンハンス対象APIの現状仕様の要約
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-07-19
references:
  - Docs/spec/api-spec.md
---

# API Documentation

> **深度メモ**: 全 API 一覧は [`Docs/spec/api-spec.md`](../../../api-spec.md) を参照。ここでは変更対象の1エンドポイントの現状仕様のみ転記する。

## REST APIs（変更対象）

### `GET /api/resources`（リソース一覧）

- **Method**: GET
- **Path**: `/api/resources`
- **Purpose**: リソース一覧をカテゴリ・空き確認期間・ページングで絞り込んで返す（全ロール・認証必須）
- **現状のクエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `category` | string | 任意 | `ROOM` / `EQUIPMENT` / `VEHICLE` でフィルタ |
| `from` | TIMESTAMP | 任意（`to`と同時） | 空き確認の開始日時 |
| `to` | TIMESTAMP | 任意（`from`と同時） | 空き確認の終了日時 |
| `page` | integer | 任意 | ページ番号（デフォルト 0） |
| `size` | integer | 任意 | 1ページの件数（デフォルト 20） |

- **現状にないもの**: リソース名・説明文へのキーワード検索（本エンハンスの追加対象、`keyword` パラメータ）
- **Response**: `Page<ResourceResponse>`（`content`/`totalElements`/`totalPages`/`number`/`size`/`first`/`last`）
- **既存の絞り込みルール**: `from`/`to` を指定すると当該時間帯に `PENDING`/`APPROVED` の予約があるリソースを除外。ADMIN は `is_active=false` も含む。片方のみ指定は `400 VALIDATION_ERROR`。

## Data Models（関連フィールドのみ）

### Resource

- **Fields**: `name`（必須・検索対象）, `description`（null可・検索対象）, `category`, `capacity`, `location`, `requiresApproval`, `isActive`, `createdAt`
