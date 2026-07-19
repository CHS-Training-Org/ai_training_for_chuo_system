---
type: spec
title: Business Rules（resource-list-filter）
description: keyword検索の業務ルール・バリデーション
tags:
  - ai-dlc
  - functional-design
timestamp: 2026-07-19
references:
  - Docs/spec/enhancements/resource-list-filter.md
---

# Business Rules

| ID | ルール | 対応する要件 |
|---|---|---|
| BR-01 | `keyword` は `resources.name` **または** `resources.description` に部分一致すれば結果に含める（OR結合） | RES-01 |
| BR-02 | `keyword` の一致判定は大文字小文字を区別しない（`LOWER()` 変換後に比較） | RES-02 |
| BR-03 | `keyword` は `category`・`isActive`（ロール別）・`from`/`to` の各条件と AND 結合する | RES-04 |
| BR-04 | `keyword` が null または空文字（トリム後）の場合、キーワード条件は適用しない（全件対象） | RES-03（フィールドを空にして解除） |
| BR-05 | `keyword` の前後の空白はトリムしてから比較に使う | （UI入力の一般的な扱い。既存の `category`/`from`/`to` にも同種のトリムは行っていないため、他フィールドとの一貫性を優先し `keyword` もトリムのみ行い追加バリデーションはしない） |

## バリデーションの範囲

`keyword` に対する文字種制限・長さ制限は設けない（既存の `category`/`from`/`to` も同様に制限なし）。Specification 実装ではプレースホルダーバインドを用いるため、SQLインジェクションのリスクはない（文字列連結によるクエリ組み立ては行わない）。
