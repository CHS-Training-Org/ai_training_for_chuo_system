---
type: spec
title: Business Rules - resource-keyword-filter
description: リソース一覧キーワード検索の業務ルール
tags:
  - ai-dlc
  - functional-design
  - resource
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../../../inception/requirements/requirements.md
---

# Business Rules - resource-keyword-filter

| # | ルール | 根拠 |
|---|---|---|
| BR-01 | `keyword` はリソース名（`name`）または説明文（`description`）のいずれかへの部分一致で判定する（OR） | RES-01 |
| BR-02 | 部分一致判定は大文字・小文字を区別しない | RES-02 |
| BR-03 | `keyword` が未指定・空文字・前後空白のみの場合、キーワード条件を適用しない（既存の全件取得動作を維持） | RES-01 の受入条件・Requirements Analysis 補足 |
| BR-04 | `keyword` 条件は既存の `category` 条件・可視性条件（ADMIN=全件／一般=`isActive=true` のみ）・空き確認条件（`from`/`to`）と AND で組み合わさる | RES-04 |
| BR-05 | `description` が `null` のリソースは、`keyword` が `name` に一致しない限り検索結果から除外される（`description` 側の一致判定は自然に false となる） | RES-01 の実装上の帰結（新規制約ではない） |
| BR-06 | 既存の可視性ルール・空き確認ロジック（重複判定含む）は変更しない | Non-Functional Requirements |

## 検証ケース対応表

受入条件（`requirements.md`）とルールの対応：

- 「キーワードを入力して絞り込むと、名前または説明にそのキーワードを含む結果のみが表示される」→ BR-01・BR-02
- 「キーワードフィールドを空にして絞り込むと、キーワード条件が解除される」→ BR-03
- 「カテゴリ・期間フィルタとキーワードを同時に指定できる」→ BR-04
- 「keyword パラメータ未指定時の動作は既存と変わらない」→ BR-03・BR-06
