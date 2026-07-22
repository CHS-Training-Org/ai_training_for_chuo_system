---
type: spec
title: Technology Stack（Reverse Engineering・最小深度）
description: 本エンハンスに関係する技術スタックの要約（全体は既存ドキュメント参照）
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-07-19
references:
  - Docs/ARCHITECTURE.md
---

# Technology Stack

> **深度メモ**: 全体スタックは [`Docs/ARCHITECTURE.md`](../../../../ARCHITECTURE.md) §技術スタック一覧および ルート `CLAUDE.md` の技術スタック表を参照。ここでは本エンハンスが直接触れる技術のみ列挙する。

## 本エンハンスに関係するスタック

| 技術 | 用途 |
|---|---|
| Spring Data JPA | `ResourceRepository` の検索クエリ実装（派生メソッド or Specification or `@Query`） |
| PostgreSQL | `ILIKE` による大文字小文字を区別しない部分一致検索 |
| H2 | バックエンドテストの実行環境（`ILIKE` 非対応点に留意。`@Query` 選定時は H2 互換の書き方が必要） |
| React Hook Form | 対象外（`ResourceFilterForm` は現状 `FormData` 直読みで RHF 未使用。既存パターンを踏襲） |
| Zod | 対象外（サーバーアクション側は型付けのみで入力バリデーションは行っていない） |
