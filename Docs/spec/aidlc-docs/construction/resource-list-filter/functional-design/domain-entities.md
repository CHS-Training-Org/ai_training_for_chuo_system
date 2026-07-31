---
type: spec
title: Domain Entities（resource-list-filter）
description: 本エンハンスにおけるドメインモデルへの影響
tags:
  - ai-dlc
  - functional-design
timestamp: 2026-07-19
references:
  - Docs/spec/er-diagram.md
---

# Domain Entities

## 変更の有無

新規エンティティ・新規カラムの追加はない。既存の `Resource` エンティティの `name`・`description` フィールドを検索対象として利用するのみ（ER図・スキーマの変更なし。`Docs/spec/er-diagram.md` は更新不要）。

## 既存エンティティ（参照用）

### Resource（変更なし）

| フィールド | 型 | 本エンハンスでの役割 |
|---|---|---|
| `name` | String（必須） | keyword 検索対象 |
| `description` | String（null可） | keyword 検索対象 |
| `category` | ResourceCategory | 既存フィルタ（変更なし） |
| `isActive` | boolean | 既存フィルタ（変更なし） |
