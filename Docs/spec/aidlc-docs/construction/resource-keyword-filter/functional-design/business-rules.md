---
type: spec
title: Business Rules - resource-keyword-filter
description: リソース一覧のキーワード検索機能に関する業務ルール・検証ロジック（AI-DLC Functional Design 成果物）
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

# Business Rules - resource-keyword-filter

| # | ルール | 由来 |
|---|--------|------|
| BR-01 | `keyword` はリソース名（`name`）またはリソース説明（`description`）のいずれかへの部分一致で評価する（OR） | RES-01 |
| BR-02 | `keyword` の比較は大文字・小文字を区別しない | RES-02 |
| BR-03 | `keyword` が `null`、空文字、または前後の空白を除去した結果が空文字になる場合、キーワード条件を適用しない（未指定時と同じ全件対象） | RES-03（受入条件の範囲を空白のみ入力にも拡張） |
| BR-04 | `keyword` 条件は、既存のカテゴリ条件・可視性条件（ADMIN/非ADMIN）・期間条件と AND で組み合わされる。一部条件のみ指定した場合は指定分のみが効く | RES-04 |
| BR-05 | `description` が `null` のリソースは、`keyword` 条件では常に「説明への部分一致なし」として扱う（`name` 側の一致判定には影響しない） | 既存データ（`description` は任意項目）との整合のため新設 |

## 検証（バリデーション）ロジック

- サーバー側：`keyword` に文字数上限・文字種制限は設けない（既存の `category`/`from`/`to` と同様、`ValidationException` の対象外）。
- クライアント側：既存の `ResourceFilterForm` にバリデーション基盤（Zod 等）がないため、`keyword` 欄も同様に未検証のまま送信する。送信前に前後の空白を除去し、除去後が空文字であれば `keyword` パラメータ自体を URL に含めない（BR-03 と整合させ、サーバー側の空白判定に依存しない）。

## 対象外とする事項

- キーワードによる部分一致検索の対象を `name`/`description` 以外（例：`location`）に広げることは対象外（シートの要件範囲外）。
- あいまい検索（表記ゆれ・全角半角正規化・形態素解析等）は対象外。単純な部分一致のみ。
