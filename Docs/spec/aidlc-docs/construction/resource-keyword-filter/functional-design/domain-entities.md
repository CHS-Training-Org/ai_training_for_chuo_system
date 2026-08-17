---
type: spec
title: Domain Entities - resource-keyword-filter
description: リソース一覧のキーワード検索機能に関わるドメインエンティティの範囲確認（AI-DLC Functional Design 成果物）
tags:
  - ai-dlc
  - functional-design
  - resource
  - search
timestamp: 2026-08-14
audience: 学習者・メンター
references:
  - Docs/spec/enhancements/resource-list-filter.md
---

# Domain Entities - resource-keyword-filter

## 新規エンティティ・スキーマ変更

なし。本機能は既存の `Resource` エンティティの既存カラムに対する検索条件の追加であり、Flyway マイグレーションは不要。

## 関連する既存フィールド（`Resource`）

| フィールド | 型 | Null 許容 | 本機能での用途 |
|-----------|-----|----------|----------------|
| `name` | `String` | 不可 | キーワード部分一致の対象 |
| `description` | `String` | 可 | キーワード部分一致の対象（`null` は不一致扱い、BR-05） |
| `category` | `ResourceCategory` | 可（未指定＝全カテゴリ） | 既存のカテゴリ条件との AND 組み合わせ |
| `isActive` | `boolean` | 不可 | 既存の可視性条件（ADMIN/非ADMIN）との AND 組み合わせ |

## リレーション

本機能はリソース単体の属性検索であり、`Reservation` 等の関連エンティティへの参照は発生しない（期間フィルタとの組み合わせ時も、キーワード条件はリソース側の絞り込みとして先に評価され、予約重複判定は既存ロジックのまま独立して動作する）。
