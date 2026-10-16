# Application Design Plan

対象: リソース一覧の `keyword` 検索（`Specification` 方式。Q4=A）。
各 `[Answer]:` の後ろに選択肢の記号を書いてください。

## Design Steps

- [x] 質問への回答を収集し、曖昧さを解消する
- [ ] components.md（コンポーネント定義と責務）
- [ ] component-methods.md（メソッドシグネチャ）
- [ ] services.md（Service のオーケストレーション）
- [ ] component-dependency.md（依存関係とデータフロー）
- [ ] application-design.md（上記の統合版）
- [ ] 設計の完全性・一貫性を検証する

## Questions

### Question 1: Specification の置き場所

動的な検索条件（category・isActive・keyword）を組み立てるクラスをどこに置きますか？

A) `domain` 層に `ResourceSpecifications`（static ファクトリ）を置く（`ResourceRepository` と同じ層。Spring Data への依存は既に domain にある）

B) `infrastructure` 層に置く（JPA 依存の実装として分離する）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）

### Question 2: 既存の派生クエリの扱い

`ResourceRepository` は `JpaSpecificationExecutor<Resource>` を継承します。既存の派生クエリ 8 本（`findByCategory`、`findByIsActiveTrue` など）はどうしますか？

A) すべて削除し、一覧は `Specification` に一本化する。`ResourceServiceTest` のモックは新メソッドに合わせて直す（組合せ爆発を解消する目的に沿う。「既存テスト pass」は、更新後のテストが pass することを指す）

B) 残して併用する。keyword なしは従来のクエリ、keyword ありだけ `Specification` を使う（既存テストは無修正だが、経路が二重になる）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）

### Question 3: keyword の正規化・検証をどこで行うか

空白除去、LIKE のエスケープ、100 文字チェックの置き場所は？

A) 空白除去と 100 文字チェックは Controller（既存の `from`/`to` 検証と同じ流儀で `ValidationException`）、エスケープは Specification 側

B) すべて Service に集約し、Controller は受け渡しのみ

C) Controller の `@Size(max = 100)` ＋ `@Validated` で宣言的に検証し、空白除去とエスケープは Service に置く

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）

### Question 4: from/to 指定時の経路

空き確認（`from`/`to`）指定時は、全候補を取得して Java で重複判定し手動ページングしています。keyword はどう適用しますか？

A) 候補取得を `findAll(Specification)`（ページなし）に置き換え、keyword も DB 側で絞る。その後の Java 判定と手動ページングは現状維持

B) 候補は従来どおり取得し、keyword だけ Java 側で絞る（DB 側の最適化は行わない）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）

### Question 5: FE の変更の置き場所

FE の変更は最小限に留めますか？

A) 既存ファイルの拡張のみ（`ResourceFilterForm` に入力欄、`page.tsx` と `resources.ts` に `keyword` を通す）。新規コンポーネントは作らない

B) 検索入力欄を再利用コンポーネントとして切り出す（`reservation-list-filter` で再利用する想定）

X) Other (please describe after [Answer]: tag below)

[Answer]: A（推奨案を承認）
