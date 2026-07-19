---
type: spec
title: Dependencies（Reverse Engineering・最小深度）
description: 本エンハンスに関係する内部依存関係の要約
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-07-19
references:
  - Docs/spec/enhancements/resource-list-filter.md
---

# Dependencies

> **深度メモ**: パッケージ間の一般的な依存関係は [`Docs/ARCHITECTURE.md`](../../../../ARCHITECTURE.md) を参照。ここでは今回のエンハンス固有の依存（他エンハンス課題との競合）のみ記載する。

## Internal Dependencies（本エンハンス固有）

### `ResourceController` は `ResourceService` に依存し、`ResourceService` は `ResourceRepository` に依存する

- **Type**: Compile
- **Reason**: 既存の3層構造。keyword フィルタもこの依存方向に沿って上流から下流へ伝播させる。

## 他エンハンス課題との依存関係

[resource-list-filter.md](../../../enhancements/resource-list-filter.md) の「依存関係」節に明記の通り:

- **競合課題**: [resource-list-sort.md](../../../enhancements/resource-list-sort.md)（同じ `GET /api/resources` と `ResourceFilterForm.tsx` を変更するため並行着手非推奨）
- **推奨順序**: 本課題（キーワード検索）を先に着手する（ソート課題の受入条件がキーワード検索との組み合わせを前提とするため）

## External Dependencies

- 変更なし（新規ライブラリ追加は不要。Spring Data JPA の既存機能で実現可能）
