---
type: note
title: Domain Entities（Functional Design）
description: AI-DLC Functional Design ステージが生成したリソース一覧ソート機能に関わるドメインモデル
tags:
  - ai-dlc
  - functional-design
timestamp: 2026-08-07
---

# Domain Entities — リソース一覧ソート機能

本機能はカラム追加・エンティティ変更を伴わない（`requirements.md` Technical Context節）。既存の `Resource` エンティティのうち、ソート対象となる3フィールドの性質のみを整理する。

## Resource（既存エンティティ、変更なし）

| フィールド | 型 | ソート対象 | 特記事項 |
|---|---|---|---|
| `name` | `String`（NOT NULL, 最大100文字） | ○ | 常に値を持つため null 考慮不要。大文字小文字を区別しない比較（BR-05） |
| `capacity` | `Integer`（nullable） | ○ | null 許容。null は常に末尾（BR-03） |
| `createdAt` | `LocalDateTime`（NOT NULL, `updatable = false`） | ○ | アプリ側採番のため一意性は実質保証される。デフォルトソート対象（BR-02） |

## 新規に導入する概念（コード上のみ、ドメインモデルへの変更なし）

### SortField（値の集合、Enumまたは文字列定数として実装）

許可されるソートフィールド名の集合。`name`・`capacity`・`createdAt` の3値（BR-01）。ドメインエンティティではなく、Controller/Service層でのバリデーション用の値集合として扱う。

### SortDirection

`asc`・`desc` の2値。Spring Data の `Sort.Direction` をそのまま利用可能なため、新規型定義は不要。
