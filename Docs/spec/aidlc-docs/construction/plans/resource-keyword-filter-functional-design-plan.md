---
type: spec
title: Functional Design Plan - resource-keyword-filter
description: AI-DLC Functional Design ステージの実行計画。resource-list-filter エンハンス課題のユニット resource-keyword-filter
tags:
  - ai-dlc
  - functional-design
  - resource
  - search
  - filter
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../../inception/requirements/requirements.md
  - ../../inception/plans/execution-plan.md
---

# Functional Design Plan - resource-keyword-filter

Units Generation を SKIP しているため、本課題全体を単一ユニット `resource-keyword-filter` として扱う。

## Unit Context

- **Unit Name**: `resource-keyword-filter`
- **責務**: リソース一覧のキーワード検索（`GET /api/resources` の `keyword` パラメータ、`ResourceFilterForm` の入力欄）
- **境界**: 既存の `ResourceController`/`ResourceService`/`ResourceRepository`/`Resource` エンティティ、`ResourceFilterForm.tsx`/`resources/page.tsx`/`server/actions/resources.ts` の範囲内。新規エンティティ・新規サービスなし

## 確認事項

`requirements.md` の「設計方針の確認」で `@Query`（JPQL）1メソッドへの集約は確定済み。ビジネスルール（AND 条件・大文字小文字非依存・空文字時のフィルタ解除）も要件シートおよび Requirements Analysis の補足で明記済みであり、追加の確認質問は不要と判断する。

## 実行ステップ

- [x] Unit Context の分析
- [x] 確認質問の要否判定（不要と判断）
- [x] `business-logic-model.md` の作成
- [x] `business-rules.md` の作成
- [x] `domain-entities.md` の作成
- [x] `frontend-components.md` の作成（フロントエンド変更を含むため）
