---
type: working-doc
title: Functional Design Plan（ユニット: resource-list-filter）
description: AI-DLC Functional Design ステージの実行計画
timestamp: 2026-10-01
---

# Functional Design Plan — resource-list-filter

## 前提

Units Generation / Application Design はWorkflow Planningで共にSKIPと判定済み（単一ユニットオブワーク、既存コンポーネント境界内の変更のため）。ユニット定義ファイルの代わりに、`Docs/spec/aidlc-docs/inception/requirements/requirements.md` と `Docs/spec/aidlc-docs/inception/plans/execution-plan.md` をユニットのスコープとして扱う。

## 明確化の状況

Requirements Analysisの明確化質問で、以下3点の設計方針は既に確定済み（再度の質問は行わない）：
- クエリ実装方式：`@Query`（JPQL）による `search()` への統合
- LIKEワイルドカードエスケープ：スコープ外
- フィルタ条件のパラメータオブジェクト化：スコープ外（最小追加）

残るのは実装レベルの技術的詳細（SQL条件式の組み立て、既存6メソッドの扱い、フロントエンドのprops/state設計）であり、調査済みの既存コード（`ResourceRepository`/`ResourceService`/`ResourceController`/`ResourceFilterForm.tsx`/`page.tsx`/`resources.ts`）から機械的に導出できるため、追加の確認質問は不要と判断した。

## 実行ステップ

- [x] 既存 `ResourceRepository`・`ResourceService`・`ResourceController` を読み込み、現状の分岐構造（isAdmin×category×from/to）を把握する
- [x] 既存の派生クエリメソッド6種の呼び出し元が `ResourceService` 内に閉じている（他クラスから未参照）ことを確認し、置き換え可能と判断する
- [x] 既存フロントエンド（`ResourceFilterForm.tsx`・`page.tsx`・`resources.ts`）の構造を把握する
- [x] `business-logic-model.md` を生成する
- [x] `business-rules.md` を生成する
- [x] `domain-entities.md` を生成する（変更なしの旨を記録）
- [x] `frontend-components.md` を生成する
