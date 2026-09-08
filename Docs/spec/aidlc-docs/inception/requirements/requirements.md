# Requirements — リソース一覧の検索・フィルタ追加（Issue #23）

## Intent Analysis

- **User Request**: `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（リソース一覧の検索・フィルタ追加）。`/aidlc` Pre-flight でブランチ名 `feature/CHS-MIZUNO-HIROKI/23-resource-list-filter_aidlc` から対象タスクとして特定。
- **Request Type**: Enhancement（既存機能の拡張。新規画面・新規エンティティの追加はない）
- **Scope Estimate**: Multiple Components（backend: `domain`/`application`/`presentation` の3層、frontend: `ResourceFilterForm.tsx`・`lib/schemas/resource.ts`）
- **Complexity Estimate**: Simple（既存の `ResourceService`/`ResourceRepository`/`ResourceFilterForm` の延長で完結する。新規ユースケース・新規承認フローはない）
- **Depth**: Minimal〜Standard（エンハンス要求シートに要件・受入条件・影響範囲が既に明記されているため、Reverse Engineering で判明した既存実装の実態を踏まえた技術的前提の補足に留める）

## 背景

BookFlow のリソース一覧画面（`/resources`）には、カテゴリ選択と空き確認期間（`from`/`to`）のフィルタが実装済みである。しかしリソース名・説明文によるキーワード検索は存在しない。`GET /api/resources` は `category`・`from`・`to`・`page` のみを受け付け、`ResourceFilterForm.tsx` にもキーワード入力欄がない。リソース数が増えると目当てのリソースを見つけるのに手間がかかるため、名称・説明文への部分一致検索を追加してユーザビリティを向上させる。ユースケース UC-02（リソース一覧・空き確認）の拡張にあたる。

## Functional Requirements

| # | 要件 |
|---|------|
| RES-01 | `GET /api/resources` にキーワード検索クエリパラメータ（`keyword`）を追加し、`resources.name` および `resources.description` への部分一致で結果を絞り込める |
| RES-02 | キーワード検索は大文字・小文字を区別しない（ILIKE または小文字変換による比較） |
| RES-03 | `ResourceFilterForm` にキーワード入力フィールドを追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する |
| RES-04 | 既存のカテゴリ・期間フィルタとキーワードフィルタは AND 条件で組み合わせられる |

## Non-Functional Requirements

- **設計方針（ユーザー指示・2026-09-08）**: `keyword` によるフィルタリングは DB 側（`ILIKE`・カスタム `@Query`・`Specification` 等）では行わず、既存の `from`/`to` 空き確認フィルタ（`ResourceService.listWithAvailabilityFilter`）と同じ Java 側（アプリケーション層）での全件取得後フィルタリングパターンを踏襲すること。これは明示的なユーザーの決定であり、当初案（DB側 `ILIKE` によるフィルタ）を撤回して既存実装との一貫性を優先する。Reverse Engineering `code-quality-assessment.md` で指摘した「アプリケーション側フィルタによるスケーラビリティの懸念」は、この決定により keyword フィルタにも同様に当てはまることを許容する。
- **設計上の含意**: `keyword` が指定された場合、`ResourceService.listPaginated`（現状 Repository 側でページネーションする経路）をそのまま使うと DB 側フィルタなしに `keyword` を適用できない。そのため `keyword` 指定時は `listWithAvailabilityFilter` と同様に「全候補取得 → Java側で `keyword` フィルタ（`name`/`description` の部分一致、大文字小文字無視） → 手動ページネーション」の経路を通す必要がある（`from`/`to` が未指定でも同様の経路が必要になる点に注意）。分岐構造の具体的な実装方法（`list` メソッドの再構成方法）は Functional Design / Code Generation で決定する。
- **後方互換性**: `keyword` パラメータ未指定時の挙動は既存と完全に同一であること（全件取得、他フィルタとの組み合わせも現状通り）。
- **セキュリティ**: DB 側でのクエリ構築を行わないため、SQL インジェクションのリスクは新たに生じない。Java 側の文字列比較（例: `String.toLowerCase().contains(...)`）で判定すること。
- **国際化・文字表現**: 半角/全角の正規化、かな⇄カナの表記ゆれ吸収は対象外（エンハンス要求シートに明記なし。素朴な部分一致・大文字小文字無視のみを実装する）。

## User Scenarios

- **通常検索**: ユーザーが「会議室A」等のキーワードを入力して「絞り込む」を押すと、名称または説明文にそのキーワードを含むリソースのみが一覧に表示される。
- **キーワード解除**: キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除され他のフィルタ条件のみが適用される。
- **複合フィルタ**: カテゴリ・期間フィルタとキーワードを同時に指定すると、3条件すべてを満たすリソースのみが表示される（AND条件）。
- **リセット**: 既存の「リセット」ボタン（`handleReset`）は全パラメータを削除して `/resources` に遷移する既存動作のままでよい（キーワード追加に伴う変更は不要）。
- **該当なし**: キーワードに合致するリソースが1件もない場合、既存の空リスト表示（0件時の挙動）がそのまま適用される（新規のUI分岐は不要）。

## Business Context

- **Goals**: リソース数増加時の検索性向上（ユーザビリティ改善）。
- **Constraints**: 推定工数2〜3時間（エンハンス要求シート記載）。既存の `GET /api/resources`・`ResourceFilterForm.tsx` のみに依存し、他のエンハンス課題（`resource-list-sort.md` 等）はこの課題の完了後に着手される前提のため、本課題の実装で他課題の設計を先取りする必要はない。
- **Success Criteria**: 受入条件（下記）をすべて満たすこと。

## Technical Context

- **対象レイヤー**: 両方（backend: `domain/ResourceRepository.java`, `application/ResourceService.java`, `presentation/ResourceController.java`。frontend: `app/(authenticated)/resources/ResourceFilterForm.tsx`, `server/actions/resources.ts`, `lib/schemas/resource.ts` に相当する一覧取得パラメータの型）
- **既存実装の前提**（Reverse Engineering `api-documentation.md`/`code-structure.md` より）:
  - `ResourceController.list` は `category`/`from`/`to`/`pageable` を受け取り `ResourceService.list` に委譲する。`keyword` パラメータをここに追加する。
  - `ResourceService.list` は `from`/`to` の有無で `listPaginated`/`listWithAvailabilityFilter` に分岐し、さらに `isAdmin`/`category` の有無で `ResourceRepository` の派生メソッドを呼び分けている。`keyword` は DB 側では絞り込まない方針のため、`ResourceRepository` に新規メソッドを追加する必要はない（既存の `fetchAllCandidates` 等で取得した候補に対して Java 側でフィルタを追加する）。
  - `ResourceRepository` は現状 Spring Data の派生クエリメソッド（`findByCategory`, `findByCategoryAndIsActiveTrue` 等）のみで変更しない。カスタム `@Query`・`Specification` は本課題では導入しない。
- **更新が必要な spec**（`/update-spec` で Code Generation より前に反映する）:
  - `docs-next/docs/spec/api-spec.md` §`GET /api/resources`：`keyword` クエリパラメータと挙動を追記
  - `docs-next/docs/spec/screen-spec.md` §`/resources`：フィルタフォームの UI 要素にキーワード入力欄を追記

## Quality Attributes

- **Testability**: `ResourceServiceTest`（既存372行の単体テスト）に `keyword` 単独・カテゴリ/期間との組み合わせのテストケースを追加する。`ResourceControllerTest`（既存の統合テスト）にもエンドポイントレベルのテストケースを追加する。
- **Reliability**: 既存のテストスイート（`ResourceServiceTest`・`ResourceControllerTest`）が引き続き pass すること（受入条件に明記）。

## Extension Configuration（本タスクでの決定）

| Extension | Enabled | 備考 |
|---|---|---|
| Security Baseline | No | 小規模な既存機能拡張のため、既存の認証・パラメータ化クエリ方針を踏襲すれば十分と判断 |
| Resiliency Baseline | No | 1クエリパラメータ追加のスケールであり、可用性/DR設計は不要と判断 |
| Property-Based Testing | No | 単純な部分一致検索の追加であり、通常のJUnitテスト（受入条件対応）で十分と判断 |

## 受入条件（エンハンス要求シートより）

- [ ] キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される
- [ ] キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除される
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND 条件で絞り込まれる）
- [ ] `keyword` パラメータ未指定時の動作は既存と変わらない（全件取得）
- [ ] バックエンドの既存テスト（`ResourceServiceTest` 等）が引き続き pass する
- [ ] 追加した検索ロジックに対応するユニットテストをバックエンドに追加する

## Summary

`GET /api/resources` に `keyword` クエリパラメータ（大文字小文字を区別しない部分一致、`name`/`description` 対象）を追加し、既存の `category`/`from`/`to` フィルタと AND 条件で組み合わせる。フロントエンドは `ResourceFilterForm` にキーワード入力欄を追加するのみで、既存のURL同期パターンを踏襲する。バックエンドは `keyword` を DB 側では絞り込まず、既存の `from`/`to` 空き確認フィルタと同じ Java 側の全件取得後フィルタリングパターンを踏襲する（ユーザー指示による設計方針）。実装上の主な設計判断は、`keyword` 指定時に `listPaginated` 経路をどのように `listWithAvailabilityFilter` 相当の経路へ合流させるかである。
