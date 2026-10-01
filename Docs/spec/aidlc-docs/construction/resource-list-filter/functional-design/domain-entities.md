---
type: working-doc
title: Domain Entities（Functional Design、ユニット: resource-list-filter）
description: AI-DLC Functional Design ステージが生成するドメインエンティティ資料
timestamp: 2026-10-01
---

# Domain Entities — resource-list-filter

## 変更なし

本ユニットはエンティティ・テーブルスキーマへの変更を伴わない。

- `Resource` エンティティ（`backend/src/main/java/com/example/bookflow/domain/Resource.java`）はフィールド変更なし。既存の `name`・`description` フィールドを検索対象に使うのみ
- `resources` テーブルへのカラム追加・インデックス追加は本ユニットのスコープに含まれない（要件シートの受入条件・影響範囲にも記載なし）
- Flywayマイグレーションの追加は不要

## 参考：検索対象フィールド

| フィールド | 型 | 検索対象 |
|---|---|---|
| `name` | `VARCHAR(100)` NOT NULL | ✅ |
| `description` | `TEXT` NULL可 | ✅（`null`は空文字列として扱う、business-rules.md BR-03） |
