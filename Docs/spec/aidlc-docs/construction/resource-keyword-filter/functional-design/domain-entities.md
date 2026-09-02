---
type: spec
title: Domain Entities - resource-keyword-filter
description: リソース一覧キーワード検索が参照するドメインモデル（新規エンティティなし）
tags:
  - ai-dlc
  - functional-design
  - resource
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../../../inception/requirements/requirements.md
---

# Domain Entities - resource-keyword-filter

## 新規エンティティ

なし。本課題は既存の `Resource` エンティティに対する検索条件の追加であり、スキーマ変更・新規エンティティの追加は行わない。

## 参照する既存エンティティ

### Resource（`resources` テーブル）

| フィールド | 型 | 本課題での用途 |
|---|---|---|
| `id` | UUID | 変更なし |
| `name` | String（最大100文字） | キーワード部分一致の対象（BR-01） |
| `category` | ResourceCategory | 既存フィルタ条件（変更なし） |
| `capacity` | Integer | 変更なし |
| `location` | String | 変更なし |
| `requiresApproval` | boolean | 変更なし |
| `isActive` | boolean | 既存の可視性条件（変更なし） |
| `description` | String（TEXT） | キーワード部分一致の対象（BR-01）。`null` 許容 |
| `createdAt` | LocalDateTime | 変更なし |

## リレーションシップ

変更なし。`Resource` と `Reservation`（空き確認用）の既存関係をそのまま利用する。
