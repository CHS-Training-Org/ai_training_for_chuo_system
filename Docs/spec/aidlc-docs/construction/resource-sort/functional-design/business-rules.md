# Business Rules — resource-sort

## BR-01: 許可されたソートフィールドのホワイトリスト検証

`sort` で指定可能なフィールドは `name`・`capacity`・`createdAt` の 3 つに限定する。これ以外のフィールド名（`id`・`isActive`・`description` 等）が指定された場合、または `asc`/`desc` 以外の方向が指定された場合は `400 VALIDATION_ERROR` を返す。

- **対応要件**: RES-01, RES-06
- **理由**: エンティティの任意プロパティでのソートを許してしまうと、意図しない内部情報の露出や、JPA 層での予期しない例外（`PropertyReferenceException`）につながる

## BR-02: デフォルトソートの維持

`sort` パラメータ自体が送信されない場合、`createdAt` の昇順（既存の挙動）を維持する。

- **対応要件**: RES-02

## BR-03: ソートは絞り込み条件とは独立した表示順の指定

`category`・`keyword`・`from`/`to`（空き確認）による絞り込みは、常に `sort` 適用前の候補集合に対して行われる。`sort` はこれらの絞り込み結果の「並び順」のみを決定し、結果の件数には影響しない。

- **対応要件**: RES-04

## BR-04: capacity が NULL のリソースの扱い

`capacity` は NULL 許容カラムである。`capacity` 順ソート時、ソート方向（昇順・降順）に関わらず、`capacity` が NULL のリソースは常に一覧の最後に表示する。

- **対応要件**: RES-05, NFR-02
- **検証方法**: `listPaginated`・`listWithAvailabilityFilter` の両経路で、H2（テスト環境）・PostgreSQL（本番環境）のいずれでも同一の並び順になることを Build and Test で確認する

## BR-05: 名称ソートは大文字小文字を区別する自然順

`name` 順ソートは、キーワード検索（Issue #23）の大文字小文字非依存一致とは独立した設計判断として、標準の文字列比較（大文字小文字を区別する自然順）を採用する。要件（「名称のアルファベット順」）は大文字小文字非依存の並び替えを求めていないため、既存コードに追加の正規化処理を導入しない。

- **対応要件**: RES-01

## BR-06: 2 つの取得経路双方へのソート適用（既存バグパターンの回避）

`listPaginated`（from/to 未指定）・`listWithAvailabilityFilter`（from/to 指定）のいずれの経路でも `sort` が適用されなければならない。特に `listWithAvailabilityFilter` は手動ページネーションのため、`Sort` から `Comparator<Resource>` を組み立てて候補リストに明示的に適用する実装が必須（Reverse Engineering で特定した構造的な抜け穴）。

- **対応要件**: RES-04
- **理由**: Issue #23（keyword 検索）でも同種の「手動ページネーション経路にフィルタ条件を適用し忘れる」リスクが存在し、そこでは `fetchAllCandidates` への引数追加で対応した。本ユニットでも同じ経路に同じ注意が必要

## BR-07: 既存パラメータとの後方互換性

`sort` パラメータ自体が送信されない既存の API 呼び出し（`listResourcesAction` の既存呼び出し元：`reservations/new/page.tsx`・`admin/resources/page.tsx` 等）の動作は一切変化しない。

- **対応要件**: RES-02
