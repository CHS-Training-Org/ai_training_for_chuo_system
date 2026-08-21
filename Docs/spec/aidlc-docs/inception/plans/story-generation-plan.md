---
type: note
title: Story Generation Plan
description: Issue #27（カレンダービュー）のUser Storiesステージ実行計画
tags:
  - ai-dlc
  - user-stories
  - plan
timestamp: 2026-08-14
---

# Story Generation Plan — カレンダービュー（Issue #27）

## 方針

- 役割：プロダクトオーナーとして、`requirements.md` のFunctional Requirements（RSV-01〜07）・User Scenarios（5件）をユーザーストーリーへ変換する。
- 内容の真実の源は `requirements.md` とする（新たな要件を追加しない。要件の「使われ方」を物語形式・受け入れ基準として明文化することが目的）。
- BookFlowでは質問回答に `AskUserQuestion` ツールを使う（ファイル内 `[Answer]:` タグ方式は採用しない。`.claude/rules/aidlc-questions.md` 参照）。

## ストーリー分割アプローチ（提案：Feature-Based）

| アプローチ | 内容 | 本タスクでの評価 |
|---|---|---|
| **Feature-Based（推奨）** | カレンダー表示・表示モード切替・期間ナビゲーション・空き枠クリックの4機能ごとにストーリー化 | 単一ペルソナ・単一画面のため、ペルソナやドメインで分ける利点が薄い。機能単位が最も追跡しやすい |
| User Journey-Based | 「予約したい利用者が空き枠を見つけて予約画面に至るまで」の一連の流れを1つの長いストーリーにする | 週/月切り替えや期間移動という独立した操作が埋もれ、個別の受け入れ基準が書きにくい |
| Persona-Based | ロール（MEMBER/APPROVER/ADMIN）ごとに分ける | 本機能はロールによる挙動差がないため分割の意味がない |
| Epic-Based | 「カレンダービュー」を1エピックとし機能ごとにサブストーリー化 | 本タスクの規模（半日〜1日）に対しエピック階層は過剰 |

## 確定事項（ユーザー確認済み、2026-08-14T09:20:00Z）

- **ストーリー分割アプローチ**: Feature-Based
- **受け入れ基準の形式**: Given-When-Then
- **ペルソナ粒度**: 単一ペルソナ（「リソース利用者」、MEMBER/APPROVER/ADMIN共通）

## 実行チェックリスト

- [x] Step A: ペルソナ定義（`personas.md`）の粒度を確認する質問を提示する
- [x] Step B: ストーリー分割・受け入れ基準の形式を確認する質問を提示する
- [x] Step C: 回答の曖昧さを分析する（3問とも一意の選択式回答であり曖昧さなし。追加質問不要）
- [x] Step D: `Docs/spec/aidlc-docs/inception/user-stories/personas.md` を生成する
- [x] Step E: `Docs/spec/aidlc-docs/inception/user-stories/stories.md` を Feature-Based・Given-When-Thenで生成する（各ストーリーはINVEST原則に従う）
- [x] Step F: ペルソナとストーリーの対応表を `stories.md` 末尾に記載する
- [ ] Step G: 完了メッセージを提示し、ユーザー承認を待つ

## 除外事項

- 実装方式（コンポーネント分割・状態管理の詳細）はUser Storiesでは扱わない（Application Design以降で扱う）
- 優先順位付け・スプリント計画は行わない
