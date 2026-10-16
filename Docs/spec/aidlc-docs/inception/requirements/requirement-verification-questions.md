# Requirements Clarification Questions

対象: リソース一覧の `keyword` 検索追加（`resource-list-filter` シート）。
シートに書かれていない判断点だけを聞きます。各 `[Answer]:` の後ろに選択肢の記号（A, B など）を書いてください。

## Question 1

`keyword` に `%` や `_`（LIKE のワイルドカード）が含まれる場合、どう扱いますか？

A) 通常の文字として検索する（エスケープする）

B) ワイルドカードとして働いてもよい（特別な処理はしない）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）

## Question 2

スペースを含む `keyword`（例: `会議室 3F`）はどう扱いますか？

A) 前後の空白だけ除去し、全体を 1 つの部分一致文字列として検索する

B) スペースで分割し、すべての語を含むものを返す（語どうしは AND）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）

## Question 3

`keyword` の最大文字数は制限しますか？（超過時は 400 `VALIDATION_ERROR`）

A) 100 文字まで（`resources.name` の長さに合わせる）

B) 制限しない

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）

## Question 4

BE の検索ロジックの実装方式は、現時点でどちらを想定しますか？（最終決定は Application Design で行います）

A) JPA `Specification`（category・isActive・keyword を動的に組み合わせる。派生クエリの組合せ爆発を解消できる）

B) `@Query` でカスタム JPQL を書く（既存の派生クエリは残し、keyword 用を追加する）

C) まだ決めない。Application Design で比較してから決める

X) Other (please describe after [Answer]: tag below)

[Answer]: A（ユーザー委任「将来も見越した判断」により Specification を選択。最終確定は Application Design）

## Question 5

`keyword` 指定で 0 件のときの画面表示は？

A) 既存の「リソースがありません。」のまま

B) 「キーワード『○○』に一致するリソースがありません。」のように、条件を示すメッセージにする

X) Other (please describe after [Answer]: tag below)

[Answer]: B（推奨案を承認）

## Question 6

追加するテストの範囲は？（BE ユニットテストは必須。シートの受入条件）

A) BE のみ（`ResourceServiceTest` と `ResourceControllerTest`）

B) BE ＋ FE ユニットテスト（`resources.test.ts` に `keyword` が query に渡ることを追加）

C) BE ＋ FE ユニットテスト ＋ E2E（Playwright）

X) Other (please describe after [Answer]: tag below)

[Answer]: B（推奨案を承認）

## Question 7: Security Extensions

Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B（推奨標準案を承認）

## Question 8: Resiliency Extensions

Should the resiliency baseline be applied to this project?

(Directional, design-time best practices derived from the AWS Well-Architected Framework Reliability Pillar. It does not certify production readiness.)

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B（推奨標準案を承認）

## Question 9: Property-Based Testing Extension

Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints

B) Partial — enforce PBT rules only for pure functions and serialization round-trips

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C（推奨標準案を承認）
