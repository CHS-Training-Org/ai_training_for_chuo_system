---
type: spec
title: Business Logic Model - resource-keyword-filter
description: リソース一覧キーワード検索の業務ロジックモデル
tags:
  - ai-dlc
  - functional-design
  - resource
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../../../inception/requirements/requirements.md
---

# Business Logic Model - resource-keyword-filter

## 対象プロセス

リソース一覧の絞り込み（既存プロセスの拡張）。利用者はカテゴリ・空き確認期間に加えて、リソース名または説明文に含まれるキーワードで一覧を絞り込める。

## 処理フロー

```mermaid
flowchart TD
    A["利用者がキーワードを入力し絞り込みを実行"] --> B{"keyword が空文字/空白のみか"}
    B -- はい --> C["keyword 条件なしとして扱う"]
    B -- いいえ --> D["keyword を検索条件として保持"]
    C --> E["既存の category / 可視性(isActive) 条件と結合"]
    D --> E
    E --> F{"from/to 指定あり"}
    F -- なし --> G["ページネーション付き一覧取得（keyword 条件を含む）"]
    F -- あり --> H["候補全件取得（keyword 条件を含む）→ 空き判定 → 手動ページネーション"]
    G --> I["結果を返す"]
    H --> I
```

## 業務ロジックの要点

- キーワード条件は既存の絞り込み条件（カテゴリ・可視性・空き確認）と**独立して**評価され、最終的に AND で結合される。既存の空き確認フィルタ（`listWithAvailabilityFilter`）は候補取得後に Java 側で予約重複を除外する構造のため、キーワード条件は「候補取得」の時点（DB クエリ）で適用し、可視性・カテゴリと同列に扱う。
- キーワードの一致判定は「リソース名またはリソース説明文のいずれかに部分一致する」の OR 条件であり、この OR 条件全体が他の条件との AND の一項になる（RES-01・RES-04 の組み合わせ）。
- 大文字小文字の違いは一致判定に影響しない（RES-02）。
