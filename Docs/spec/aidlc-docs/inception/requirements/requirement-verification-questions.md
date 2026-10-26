# Requirements Clarification Questions

ビジネス要求シート（`resource-list-filter.md`）の RES-01〜RES-04 と受入条件は明確なため、シートで決まっていない挙動の詰めと拡張機能の opt-in のみを質問します。各質問の `[Answer]:` の後ろに選択肢の記号を記入してください（「推奨」は私の見立てで、従う必要はありません）。

## Question 1
キーワードに `%` や `_`（SQL の LIKE のワイルドカード）が含まれる場合の扱いは？

A) リテラル文字として検索する（エスケープする）。推奨: 「100%」のような名称を素直に検索できる

B) ワイルドカードとして解釈される（エスケープしない）。実装は簡単だが、`%` だけで全件ヒットする

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
キーワードの前後の空白と、空白のみのキーワードの扱いは？

A) 前後の空白を除去し、除去後に空なら「キーワード指定なし」として扱う。推奨

B) 除去せず、入力された文字列をそのまま部分一致に使う

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
「会議室 プロジェクター」のようにスペースで区切った複数語の扱いは？

A) 入力全体を 1 つの文字列として部分一致する（シートの「部分一致」の文言どおり。最小実装）

B) スペースで分割し、全語を含むリソースに絞り込む（AND 検索。要件の拡張になる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
キーワードの最大文字数の制限は？

A) 制限しない

B) 100 文字を上限とし、超えたら `400 VALIDATION_ERROR` を返す（`resources.name` の最大長 100 に合わせる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A
（補足: シートに上限の記載がないため制限しない）

## Question 5
テストの範囲は？（受入条件が求めているのはバックエンドのユニットテストのみです）

A) バックエンドのみ（`ResourceServiceTest` と `ResourceControllerTest` に追加）

B) バックエンドに加え、フロントエンド（`listResourcesAction` が `keyword` を渡すこと）の Vitest も追加する

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 6
検索ロジックの実装方式の方針は？（設計ステージの要否に影響します。既存の派生クエリは `category`・`isActive`・ページ有無ごとに増えており、条件追加で組み合わせが膨らみます）

A) JPA の `Specification` に切り替え、`category`・`isActive`・`keyword` を動的に組み立てる（組み合わせ爆発を避けられるが、既存クエリの置き換えを伴う）

B) 既存の派生クエリを温存し、`@Query`（JPQL）で `keyword` 付きのメソッドを追加する（変更は小さいが、メソッドが増える）

C) 方式は設計ステージで比較してから決める

X) Other (please describe after [Answer]: tag below)

[Answer]: B
（補足: 既存 Repository は派生クエリと `@Query` で書かれており、条件数も少ないため `@Query`（JPQL）で追加する。ADMIN は無効化されたリソースも検索対象に含める（既存の一覧と同じ扱い）。期間フィルタとは AND）

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B
（補足: パラメータバインドの JPQL で SQL インジェクションは防げる前提。初級課題のため拡張は適用しない）

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads, as an informed starting point that you can validate and harden before go-live)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
