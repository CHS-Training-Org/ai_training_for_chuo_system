# Code Structure — resource-list-sort（Issue #22）追加調査

> 既存の `code-structure.md` 以下の RE 成果物は Issue #23（キーワード検索）に絞って抜粋されたもので、本課題（Issue #22・ソート順選択）には直接関係しない。全面的な再生成はせず、本課題の設計判断に必要な部分のみを本ファイルに追記する。

## 現状のソート実装

- `ResourceController#list` は `@PageableDefault(size = 20) Pageable pageable` を受け取っているが、`sort` クエリパラメータは **明示的に拒否も許可もしていない**。Spring の `PageableHandlerMethodArgumentResolver`（Spring Boot 標準設定）は `sort=<field>,<asc|desc>` 形式のクエリパラメータを自動的に `Pageable.getSort()` へ変換する機能を持つため、**バックエンドのコード変更なしでも `sort` パラメータ自体は受理されてしまう**状態にある
- ただし `Resource` エンティティの任意のプロパティ名（`id`・`isActive`・`description` 等）がそのまま受理されてしまい、要件（`name`/`capacity`/`createdAt` の 3 フィールドのみ許可）を満たさない。不正なフィールド名を指定した場合、JPA 層で `PropertyReferenceException` が送出され、ハンドリング次第では意図しない 500 になる可能性がある（既存の `from`/`to` 同時指定チェックと同様に、許可フィールドのホワイトリスト検証が必要）
- `ResourceService#list` の 2 つの経路でソートの扱いが異なる：
  - **`listPaginated`（from/to 未指定）**: `resourceRepository.findByIsActiveTrue(pageable)` 等、`Pageable` をそのまま JPA に渡す経路。`pageable.getSort()` は Spring Data JPA が自動的に `ORDER BY` に変換するため、**ホワイトリスト検証さえ入れれば追加改修なしでソートが効く**
  - **`listWithAvailabilityFilter`（from/to 指定）**: `fetchAllCandidates` で `List<Resource>` を取得した後、Java 側で占有判定フィルタをかけ、`candidates.subList(start, end)` で**手動ページネーション**している。この経路は `Pageable` の `Sort` を一切参照していないため、**keyword 検索が手動ページネーション経路を素通りするのと同様に、ソートも明示的に Java 側で適用しないと効かない**（受入条件「カテゴリ・期間フィルタやキーワード検索との組み合わせでもソートが適用される」に directly 抵触する設計上の要注意点）
- デフォルトソート（`createdAt,asc`）は現状 `@PageableDefault` に `sort` 属性を指定していないため、DB 側の自然順（主キー順・挿入順に近い）に依存している。要件 RES-02「`sort` 未指定時のデフォルトは `createdAt,asc`」を保証するには `@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC)` のような明示指定が必要

## フロントエンド

- `ResourceFilterForm.tsx`（Issue #23 で `grid-cols-1 sm:grid-cols-4` に拡張済み、category/from/to/keyword の 4 項目）にソート選択 UI は存在しない
- `frontend/src/server/actions/resources.ts` の `ListResourcesParams`/`listResourcesAction` に `sort` は存在しない
- `resources/page.tsx` の `PaginationNav` への `query={params}` は searchParams をオブジェクトごと引き継ぐ実装のため、`sort` を `SearchParams` に追加しさえすれば既存の仕組みでページネーションリンクにも自動継承される（Issue #23 で `keyword` を追加したときと同じパターン）

## 設計判断点（Functional Design で確定する事項）

1. `sort` パラメータのホワイトリスト検証をどこで行うか（Controller で許可フィールド名を検証 / Service 層で検証 / `Sort.Order` を自前で組み立てて `Pageable` を再構築、等）
2. `listWithAvailabilityFilter` の手動ページネーション経路に、`Comparator` ベースの Java 側ソートをどう適用するか（`Sort.Order` から `Comparator<Resource>` を組み立てる方針が妥当と見られる）
3. 不正な `sort` 値（存在しないフィールド名・不正な方向）を 400 VALIDATION_ERROR にするか、デフォルト値にフォールバックするか
