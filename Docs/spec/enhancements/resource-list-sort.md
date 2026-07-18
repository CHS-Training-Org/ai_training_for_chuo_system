---
type: spec
title: リソース一覧のソート順選択
description: リソース一覧の並び替え基準をユーザーが選択できるエンハンス課題のビジネス要求シート
tags:
  - spec
  - enhancement
  - resource
  - sort
timestamp: 2026-07-06
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# リソース一覧のソート順選択

---

## 背景

BookFlow のリソース一覧（`/resources`）は現在、登録日時（`created_at`）の昇順で固定表示されています。`GET /api/resources` にソートパラメータは存在せず、`ResourceFilterForm.tsx` にも並び替え UI がありません。

リソース名のアルファベット順や定員の大きい順で探したいケースがあるため、並び替え選択機能を追加します。Spring Data の `Pageable`（`Sort`）を活用すれば、最小限のコード変更でサーバーサイドソートを実現できます。

## 依存関係

- 前提課題：[リソース一覧の検索・フィルタ追加](./resource-list-filter.md)。本課題の受入条件「カテゴリ・期間フィルタやキーワード検索との組み合わせでもソートが適用される」は、キーワード検索機能（前提課題の成果物）が存在しないと検証できないため。
- 競合する課題：なし（前提課題を完了させてから着手するため、実質的に並行着手にはならない。両課題とも `GET /api/resources` と同一の `ResourceFilterForm.tsx` を変更するが、順序が固定されるため衝突しない）
- 推奨着手順序：前提課題の完了後、本課題に着手する。後続として [OpenAPI クライアント自動生成](./openapi-client-gen.md)・[既存機能の E2E テスト追加](./e2e-test-coverage.md) がある。

## 要件

| # | 要件 |
|---|------|
| RES-01 | `GET /api/resources` にソートパラメータ（`sort`）を追加し、`name`・`capacity`・`createdAt` のいずれかのフィールドと、昇順（`asc`）・降順（`desc`）の方向を指定できる |
| RES-02 | `sort` パラメータ未指定時のデフォルトは既存の登録日時昇順（`createdAt,asc`）を維持する |
| RES-03 | `ResourceFilterForm` にソート選択 UI（ドロップダウン等）を追加し、選択値を URL パラメータとして付与する |

## 受入条件

- [ ] 名称順（昇順・降順）でリソース一覧を並び替えられる
- [ ] 定員順（昇順・降順）でリソース一覧を並び替えられる
- [ ] ソート未選択時は従来どおり登録日時昇順で表示される
- [ ] カテゴリ・期間フィルタやキーワード検索との組み合わせでもソートが適用される
- [ ] バックエンドの既存テストが引き続き pass する

## 影響範囲

- 推定工数：1〜2時間
- 対象レイヤー：両方
- 更新が必要な spec：
  - `api-spec.md` §`GET /api/resources`：`sort` クエリパラメータと有効値を追記
  - `screen-spec.md` §`/resources`：フィルタフォームにソート選択 UI を追記

## AI 活用ポイント

- `Pageable` の `Sort` パラメータへのマッピング方法を AI に確認する（`PageableHandlerMethodArgumentResolver` の標準的な記法）
- バックエンドの実装量は少ないため、フロントエンドの UI デザイン（ドロップダウン vs. カラムヘッダクリック）を AI と相談して決める
