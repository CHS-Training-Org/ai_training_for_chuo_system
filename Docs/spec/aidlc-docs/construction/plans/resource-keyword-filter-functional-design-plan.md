---
type: spec
title: Functional Design Plan - resource-keyword-filter
description: AI-DLC Functional Design ステージの実行計画（resource-keyword-filter ユニット）
tags:
  - ai-dlc
  - functional-design
  - plan
  - resource
timestamp: 2026-08-14
audience: 学習者・メンター
references:
  - Docs/spec/aidlc-docs/inception/requirements/requirements.md
  - Docs/spec/aidlc-docs/inception/plans/execution-plan.md
---

# Functional Design Plan - resource-keyword-filter

## 実行ステップ

- [x] Unit Context の確認（Units Generation は SKIP のため、`execution-plan.md`／`requirements.md` を入力として使用）
- [x] 設計判断の確認（`AskUserQuestion` を使用。ファイル方式の `[Answer]:` タグは BookFlow では不採用 — `.claude/rules/aidlc-questions.md` 参照）
  - 論点：`ResourceRepository` への `keyword` 追加方式（`@Query` 一本化 or `Specification` 導入）
  - 結果：`@Query`（JPQL）で一本化（ユーザー選択、理由：既存コードベースに `@Query` の前例あり・`ResourceRepository` は `ResourceService` 以外から未参照で置換の影響が閉じている）
- [x] Functional Design 成果物の生成
  - [x] `business-logic-model.md`
  - [x] `business-rules.md`
  - [x] `domain-entities.md`
  - [x] `frontend-components.md`（本ユニットはフロントエンドを含むため生成）

## 検討したが質問しなかった論点（判断根拠を明記）

- **空白のみのキーワード入力の扱い**：受入条件は「空にして絞り込む」のみ言及しているが、空白のみの入力も同じ扱い（フィルタ解除）とするのが自然で、選択肢が実質一つしかないため質問化しなかった（`business-rules.md` BR-03）。
- **`description` が `null` のリソースの扱い**：既存データモデル上 `description` は任意項目であり、`null` を「不一致」として扱うのが唯一自然な解釈のため質問化しなかった（`business-rules.md` BR-05）。
