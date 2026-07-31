---
type: spec
title: Requirements（resource-list-filter）
description: リソース一覧の検索・フィルタ追加エンハンス課題の要件定義（AI-DLC Requirements Analysis 成果物）
tags:
  - ai-dlc
  - requirements
timestamp: 2026-07-19
references:
  - Docs/spec/enhancements/resource-list-filter.md
  - Docs/spec/aidlc-docs/inception/reverse-engineering
---

# Requirements

## Intent Analysis Summary

- **User Request**: 「resource-list-filterを進めたい」（既存の業務要求シート [resource-list-filter.md](../../../enhancements/resource-list-filter.md) を対象とした着手指示）
- **Request Type**: Enhancement（既存機能の拡張。UC-02 リソース一覧・空き確認の拡張）
- **Scope Estimate**: Multiple Components（backend 3ファイル・frontend 3ファイル、単一フィーチャー内での縦切り）
- **Complexity Estimate**: Simple（新規データモデルなし。既存の絞り込みロジックへの条件追加）
- **Requirements Depth**: Minimal（既存の業務要求シートが要件・受入条件・影響範囲・依存関係を既に網羅しており、追加の曖昧点がないため、深掘りの質問ラウンドは実施しなかった。拡張機能オプトインの3問のみ確認済み）

## 機能要件

既存の業務要求シート [resource-list-filter.md](../../../enhancements/resource-list-filter.md) の要件をそのまま採用する。

| # | 要件 |
|---|------|
| RES-01 | `GET /api/resources` にキーワード検索クエリパラメータ（`keyword`）を追加し、`resources.name` および `resources.description` への部分一致で結果を絞り込める |
| RES-02 | キーワード検索は大文字・小文字を区別しない（ILIKE または小文字変換による比較） |
| RES-03 | `ResourceFilterForm` にキーワード入力フィールドを追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する |
| RES-04 | 既存のカテゴリ・期間フィルタとキーワードフィルタは AND 条件で組み合わせられる |

## 非機能要件

- **保守性**: [reverse-engineering/code-structure.md](../reverse-engineering/code-structure.md) で検出した `ResourceRepository` の派生クエリメソッド組み合わせ爆発を、本エンハンスの実装でこれ以上悪化させない。keyword 条件を単純な派生メソッド名の追加で実現せず、`Specification` または `@Query` への集約を検討する（設計判断は Workflow Planning／Functional Design で確定）
- **互換性**: `keyword` 未指定時の動作は既存と変わらない（後方互換）
- **テスト容易性**: 既存の `ResourceServiceTest`・`ResourceControllerTest` のパターンに沿ってユニットテストを追加できること

## 受入条件

業務要求シートの受入条件をそのまま採用する。

- [ ] キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される
- [ ] キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除される
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND 条件で絞り込まれる）
- [ ] `keyword` パラメータ未指定時の動作は既存と変わらない（全件取得）
- [ ] バックエンドの既存テスト（`ResourceServiceTest` 等）が引き続き pass する
- [ ] 追加した検索ロジックに対応するユニットテストをバックエンドに追加する

## Extension Configuration

- Security Baseline: 非適用（学習用チュートリアルアプリの小規模エンハンスと判断）
- Resiliency Baseline: 非適用（単一DBクエリの条件追加で可用性・障害復旧に影響する変更ではない）
- Property-Based Testing: 非適用（ILIKE部分一致というシンプルな条件追加で、複雑なアルゴリズム・データ変換を含まないため）

## 影響範囲・依存関係（RE成果物からの転記）

- 推定工数：2〜3時間、対象レイヤー：両方
- 更新が必要な spec：`api-spec.md` §`GET /api/resources`、`screen-spec.md` §`/resources`
- 競合課題：[resource-list-sort.md](../../../enhancements/resource-list-sort.md)（並行着手非推奨、本課題を先行させる）
