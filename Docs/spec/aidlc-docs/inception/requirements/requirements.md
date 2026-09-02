---
type: spec
title: Requirements Analysis - リソース一覧の検索・フィルタ追加
description: AI-DLC Requirements Analysis ステージの成果物。resource-list-filter エンハンス課題の要件分析結果
tags:
  - ai-dlc
  - requirements
  - resource
  - search
  - filter
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - docs-next/docs/spec/enhancements/beginner/resource-list-filter.md
  - docs-next/docs/spec/api-spec.md
  - docs-next/docs/spec/screen-spec.md
---

# Requirements Analysis - リソース一覧の検索・フィルタ追加

## Intent Analysis Summary

- **User Request**: `/aidlc` 起動（引数なし）。Pre-flight でブランチ名（`feature/CHS-MIZUNO-HIROKI/22-resource-list-filter_aidlc`）が命名規約に合致していたため、対象タスクを `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（issue #22「リソース一覧の検索・フィルタ追加」）と特定した。
- **Request Type**: Enhancement（既存機能の拡張）
- **Scope Estimate**: Multiple Components（バックエンド：Controller・Service・Repository・テスト、フロントエンド：`ResourceFilterForm.tsx`・呼び出し元ページ・Server Action）
- **Complexity Estimate**: Simple〜Moderate（機能自体は単純だが、`ResourceRepository` の既存実装方式との整合を取る設計判断を伴う）

## 現状把握（コード調査結果）

- `GET /api/resources`（`ResourceController.list()`）は `category`・`from`・`to`・`page`/`size` を受け付ける。`from`/`to` はどちらか一方のみの指定を拒否する（`400 VALIDATION_ERROR`）。
- `ResourceService.list()` は `from`/`to` の有無で分岐し、両方 null なら `listPaginated()`（DB ページネーション）、両方指定なら `listWithAvailabilityFilter()`（全候補取得後に予約重複を Java 側で除外し手動ページネーション）を呼ぶ。いずれの経路でも `fetchAllCandidates`/`listPaginated` 内で ADMIN 可視性（`isActive`）・カテゴリの分岐がある。
- `ResourceRepository` は Spring Data のメソッド名派生方式（`findByCategoryAndIsActiveTrue` 等）で、ページ有無・ADMIN 可視性（`isActive`）・category 有無の組み合わせで既に6メソッドが存在する。ここに `keyword` を単純に組み合わせると、メソッド数がさらに倍増し破綻しやすい。
- フロントエンドの `ResourceFilterForm.tsx` はカテゴリ（Select）と期間（`datetime-local` 2つ）のみで、キーワード入力欄は存在しない。送信時は `FormData` から `URLSearchParams` を組み立てて `router.push` する方式（Zod 等のバリデーション基盤は導入されていない）。
- `resources/page.tsx`（サーバーコンポーネント）が `searchParams` を受け取り `listResourcesAction()` に渡す。`server/actions/resources.ts` の `ListResourcesParams`/`listResourcesAction` が `category`/`from`/`to`/`page`/`size` を BE へ中継する。
- `docs-next/docs/spec/api-spec.md` §`GET /api/resources`・`docs-next/docs/spec/screen-spec.md` §`/resources` のいずれにも `keyword` の記載はない。
- バックエンドの既存テスト（`ResourceServiceTest`/`ResourceControllerTest`）が存在する。

## 設計方針の確認（AskUserQuestion 済み）

`ResourceRepository` の検索条件実装方式について、下記2択で確認した。

- A. `@Query`（JPQL）1メソッドに集約
- B. JPA `Specification` で動的クエリ

**回答**: A（`@Query` JPQL 1メソッドに集約）。category・isActive・keyword を null 許容の JPQL 条件分岐で表現し、既存の `findByCategory` 系メソッド群をこの1メソッドに置き換える。

## Functional Requirements

`docs-next/docs/spec/enhancements/beginner/resource-list-filter.md` の要件をそのまま踏襲する。

| # | 要件 |
|---|------|
| RES-01 | `GET /api/resources` にキーワード検索クエリパラメータ（`keyword`）を追加し、`resources.name` および `resources.description` への部分一致で結果を絞り込める |
| RES-02 | キーワード検索は大文字・小文字を区別しない（ILIKE または小文字変換による比較） |
| RES-03 | `ResourceFilterForm` にキーワード入力フィールドを追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する |
| RES-04 | 既存のカテゴリ・期間フィルタとキーワードフィルタは AND 条件で組み合わせられる |

### 補足（現状把握を踏まえた明確化）

- RES-04 の AND 条件は、`listPaginated()`・`listWithAvailabilityFilter()` の両方の経路（`from`/`to` 指定の有無いずれでも）で成立させる必要がある。
- `keyword` を空文字または前後空白のみで送信した場合は、未指定時と同じ扱い（フィルタ解除）とする。受入条件「キーワードフィールドを空にして『絞り込む』を押すと、キーワード条件が解除される」の範囲を、空白のみの入力にも自然に拡張したものである。

## Non-Functional Requirements

- 既存の可視性ルール（ADMIN は全件、一般ユーザーは `isActive = true` のみ）は、キーワード条件を追加しても変更しない。
- 既存のバックエンドテスト（`ResourceServiceTest`・`ResourceControllerTest`）が引き続き pass すること（シート要件どおり）。
- データ件数は学習用途の規模であり、新規に性能要件（インデックス追加等）は設けない。

## Acceptance Criteria

`docs-next/docs/spec/enhancements/beginner/resource-list-filter.md` の受入条件をそのまま踏襲する。

- [ ] キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される
- [ ] キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除される
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND 条件で絞り込まれる）
- [ ] `keyword` パラメータ未指定時の動作は既存と変わらない（全件取得）
- [ ] バックエンドの既存テスト（`ResourceServiceTest` 等）が引き続き pass する
- [ ] 追加した検索ロジックに対応するユニットテストをバックエンドに追加する

## Technical Considerations（後続ステージへの申し送り）

- `ResourceRepository` は `@Query`（JPQL）1メソッドに集約する方針で確定済み（上記「設計方針の確認」参照）。既存のメソッド名派生クエリ群（`findByCategory`・`findByCategoryAndIsActiveTrue`・`findByIsActiveTrue`・`findAll` の呼び分け）をこの1メソッドに統合し、`ResourceService` 側の分岐（`isAdmin`/`category` 有無）を簡潔にする。
- フロントエンドにはバリデーション基盤（Zod 等）が導入されていないため、キーワード入力欄も既存パターン（バリデーションなし・空文字チェックのみ）に合わせる。

## Spec 更新対象（シートより）

- `docs-next/docs/spec/api-spec.md` §`GET /api/resources`：`keyword` クエリパラメータと挙動を追記
- `docs-next/docs/spec/screen-spec.md` §`/resources`：フィルタフォームの UI 要素にキーワード入力欄を追記
