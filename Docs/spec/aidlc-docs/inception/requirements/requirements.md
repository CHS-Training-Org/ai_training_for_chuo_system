# Requirements — リソース一覧の検索・フィルタ追加（Issue #23）

## Intent Analysis Summary

- **User Request**: GitHub Issue #23「リソース一覧の検索・フィルタ追加」。エンハンス課題シート [`resource-list-filter.md`](../../../../docs-next/docs/spec/enhancements/beginner/resource-list-filter.md) と内容一致
- **Request Type**: Enhancement（既存機能への追加）
- **Scope Estimate**: Multiple Components（frontend + backend の縦切り）
- **Complexity Estimate**: Moderate（`ResourceRepository` の派生クエリ方式の構造的制約への対応、H2/PostgreSQL 双方での大文字小文字非依存検索の整合性確認が必要）
- **Depth**: Standard

## 背景

BookFlow のリソース一覧画面（`/resources`）には、カテゴリ選択と空き確認期間（`from`/`to`）のフィルタが実装済みだが、リソース名・説明文によるキーワード検索は存在しない。`GET /api/resources` は `category`・`from`・`to`・`page`・`size` のみを受け付け、`ResourceFilterForm.tsx` にもキーワード入力欄がない。リソース数増加時の検索性向上のため、名称・説明文への部分一致検索を追加する（UC-02「リソース一覧・空き確認」の拡張）。

## 機能要件（Functional Requirements）

| # | 要件 |
|---|---|
| RES-01 | `GET /api/resources` にキーワード検索クエリパラメータ（`keyword`）を追加し、`resources.name` および `resources.description` への部分一致で結果を絞り込める |
| RES-02 | キーワード検索は大文字・小文字を区別しない |
| RES-03 | `ResourceFilterForm` にキーワード入力フィールドを追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する |
| RES-04 | 既存のカテゴリ・期間フィルタとキーワードフィルタは AND 条件で組み合わせられる |
| RES-05 | 空白のみのキーワード（スペースのみ入力）は「未入力」として扱う。フロントエンド（`ResourceFilterForm.tsx` の送信処理）・バックエンド（`ResourceController`/`ResourceService`）の双方で trim 後に空文字ならキーワード条件を付与・適用しない |

## 非機能要件（Non-Functional Requirements）

| # | 要件 |
|---|---|
| NFR-01 | 既存の `category`／`from`／`to`／`page`／`size` パラメータの挙動・レスポンス形式（`Page<ResourceResponse>`）に変更を加えない |
| NFR-02 | `keyword` 未指定時（パラメータ自体を送らない場合）の動作は現状と完全に同一（全件取得） |
| NFR-03 | `description` は `NULL` 許容カラムのため、キーワード検索条件は `description IS NULL` のレコードを検索対象から誤って除外・エラーとしない |
| NFR-04 | 検索は H2（テスト、`MODE=PostgreSQL` 互換）と PostgreSQL（本番）の両方で同一の大文字小文字非依存の部分一致結果を返す |
| NFR-05 | `%`・`_` を含むキーワードを入力した場合も、LIKE 演算子のワイルドカードとして誤動作せず、リテラル文字として扱われる（エスケープ処理） |

## ユーザーシナリオ（User Scenarios）

- ユーザーがキーワード欄に「会議室」と入力し「絞り込む」を押すと、`name` または `description` に「会議室」を含むリソースのみが一覧表示される
- ユーザーがキーワード欄を空のまま（または空白のみ入力して）「絞り込む」を押すと、キーワード条件なしで一覧表示される（既存の category/from/to フィルタのみ適用）
- ユーザーがカテゴリ・期間・キーワードを同時に指定すると、3条件すべてを満たすリソースのみ表示される
- 大文字小文字の異なる表記（「Room」「room」等）でも同じ結果が得られる

## ビジネスコンテキスト（Business Context）

- **Goals**: リソース数増加時の検索性向上（ユーザビリティ改善）
- **Constraints**: 既存 API・既存テストへの後方互換性を維持すること
- **Success Criteria**: 受入条件（下記）をすべて満たし、既存テストが継続して pass する

## 技術コンテキスト（Technical Context）

- **Integration Points**: frontend の `ResourceFilterForm.tsx` → `server/actions/resources.ts`（`listResourcesAction`）→ backend `ResourceController` → `ResourceService` → `ResourceRepository`
- **データ要件**: `resources.name`（`VARCHAR(100) NOT NULL`）・`resources.description`（`TEXT NULL`）への部分一致検索。スキーマ変更なし
- **技術的判断点**（Reverse Engineering で特定、Application Design / Code Generation 段階で決定）：
  - `ResourceRepository` の派生クエリメソッド名方式（category × isActive の組み合わせ）に keyword を素朴に追加すると組み合わせが最大 8 通りに倍増するため、`@Query`（JPQL、null 許容パラメータ分岐）または JPA `Specification` への切り替えを検討する
  - 大文字小文字非依存の部分一致は `LOWER(...) LIKE LOWER(...)` 方式（PostgreSQL/H2 双方で確実に同一動作）を基本とし、DB 固有の `ILIKE` は採用しない
  - `%`・`_` のエスケープ処理を検索条件構築時に行う
- **既存コードとの整合性制約**（Reverse Engineering で特定、実装が守るべき制約）：
  - `ResourceService#list` は `listPaginated`（from/to 未指定）と `listWithAvailabilityFilter`（from/to 指定、`fetchAllCandidates` 経由）の 2 経路を持つ。keyword フィルタは**両経路に適用**しなければならない。片方の経路にのみ適用すると、keyword と from/to を同時指定した場合に keyword 条件が無視される（RES-04 の AND 条件に違反）
  - `ResourceServiceTest` は `findByIsActiveTrue(pageable)`・`findAll(pageable)`・`findByIsActiveTrue()` 等の既存派生クエリメソッドを `MockitoExtension`（strict stubs）でスタブしている。keyword が未指定（null/空白）の場合は、これら既存の派生クエリ呼び出し経路を維持し、keyword が指定された場合にのみ新しいクエリ機構（`@Query`/`Specification`）を通す設計とすることで、既存テストの改修を呼び出し箇所の引数追加（`null` を渡す）程度に留め、アサーション自体は変更不要にする

## 品質属性（Quality Attributes）

- **Reliability**: 既存の `ResourceServiceTest`／`ResourceControllerTest`／`resources.test.ts` が継続して pass すること
- **Testability**: 追加する検索ロジックに対応するバックエンドのユニットテストを追加すること（大文字小文字非依存・部分一致・AND条件・keyword未指定時の後方互換性・空白のみ入力時の挙動を検証）
- **Maintainability**: 既存の「フィルタ値が空なら既存パラメータを付与しない」パターン（FE/BFF）を踏襲する

## 受入条件（Acceptance Criteria）

- [ ] キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される（大文字小文字を区別しない）
- [ ] キーワードフィールドを空、または空白のみにして「絞り込む」を押すと、キーワード条件が解除される
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND 条件で絞り込まれる）
- [ ] `keyword` パラメータ未指定時の動作は既存と変わらない（全件取得）
- [ ] バックエンドの既存テスト（`ResourceServiceTest`・`ResourceControllerTest` 等）が引き続き pass する
- [ ] 追加した検索ロジックに対応するユニットテストをバックエンドに追加する

## 拡張設定（Extension Configuration）

| Extension | Enabled | 理由 |
|---|---|---|
| Security Baseline | No | 学習用チュートリアルの小規模エンハンス課題であり、ブロッキング制約としての適用は不要と判断 |
| Resiliency Baseline | No | 検索条件追加のみの変更で、可用性・災害復旧等の設計変更は不要 |
| Property-Based Testing | No | 単純な文字列部分一致検索であり、既存のユニットテスト（具体例ベース）で十分カバーできる |

## スコープ外（Out of Scope）

- OpenAPI クライアント自動生成・E2E テスト追加（エンハンス課題シートに後続課題として記載されている別課題）
- リソース一覧のソート順選択（本課題の完了を前提とする別課題）
- `ResourceFilterForm` 以外の画面（`/admin/resources` 等）へのキーワード検索追加
