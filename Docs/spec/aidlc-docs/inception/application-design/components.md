# Components

決定事項（application-design-plan.md の回答）: Q1=A（domain 層）、Q2=A（派生クエリを削除し一本化）、Q3=A、Q4=A、Q5=A。

## Backend

### ResourceSpecifications（新規・domain 層）
- **Purpose**: リソース一覧の動的な検索条件を `Specification<Resource>` として組み立てる（static ファクトリ。インスタンス化しない）
- **Responsibilities**:
  - isActive 条件（非 ADMIN のみ）、category 条件、keyword 条件の生成
  - keyword の LIKE エスケープ（`\`、`%`、`_` をリテラル化）と小文字化比較
- **Interfaces**: `isActive()`、`hasCategory(category)`、`keywordContains(keyword)`、`forList(category, keyword, isAdmin)`

### ResourceRepository（変更・domain 層）
- **Purpose**: 永続化アクセス
- **Responsibilities**: `JpaSpecificationExecutor<Resource>` を継承し、`findAll(Specification, Pageable)` と `findAll(Specification)` を提供。既存の派生クエリ 8 本（`findByCategory*`、`findByIsActiveTrue*`）は削除。`findByIdForUpdate` は残す

### ResourceController（変更・presentation 層）
- **Purpose**: `keyword` クエリパラメータの受付と検証
- **Responsibilities**: 前後の空白除去、空なら null 化、100 文字超は `ValidationException`（既存の `from`/`to` 検証と同じ流儀）

### ResourceService（変更・application 層）
- **Purpose**: 一覧のオーケストレーション
- **Responsibilities**: Specification の生成、`from`/`to` 指定時の候補取得（ページなし）と Java での重複判定、手動ページング

## Frontend（既存ファイルの拡張のみ。Q5=A）
- `ResourceFilterForm.tsx`: キーワード入力欄（`name="keyword"`、`maxLength=100`）、送信時に非空なら `keyword` を付与、`defaultKeyword` を受け取る
- `page.tsx`: `SearchParams` に `keyword` を追加、`listResourcesAction` へ渡す、0 件メッセージの出し分け
- `resources.ts`: `ListResourcesParams` に `keyword` を追加し query に載せる
