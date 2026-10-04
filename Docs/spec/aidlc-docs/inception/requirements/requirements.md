# Requirements — resource-list-sort（Issue #22）

## Intent Analysis Summary

- **User Request**: `docs-next/docs/spec/enhancements/beginner/resource-list-sort.md`（リソース一覧のソート順選択）
- **Request Type**: Enhancement（既存機能への追加）
- **Scope**: Multiple Components（frontend + backend）
- **Complexity**: Moderate（表面上は `Pageable`/`Sort` を使った小規模な変更に見えるが、Reverse Engineering で判明したとおり `ResourceService` の 2 つの一覧取得経路のうち `listWithAvailabilityFilter`〔from/to 指定時〕は手動ページネーションのため `Sort` が自動適用されず、Java 側で明示的にソートを適用する実装が必要。NULL capacity の並び順・不正な sort 値の扱いなど DB 横断の整合性判断も伴う）
- **Depth**: Standard

## 機能要件

| # | 要件 |
|---|------|
| RES-01 | `GET /api/resources` に `sort` クエリパラメータ（Spring `Pageable` 標準形式 `sort=<field>,<asc\|desc>`）を追加し、`name`・`capacity`・`createdAt` のいずれかのフィールドを許可する |
| RES-02 | `sort` 未指定時のデフォルトは `createdAt,asc`（登録日時昇順）を維持する |
| RES-03 | `ResourceFilterForm` にソート選択 UI（ドロップダウン）を追加し、選択値を URL パラメータとして付与する |
| RES-04 | `category`・`from`/`to`・`keyword`（前提課題 Issue #23 の成果物）のいずれと組み合わせてもソートが適用される。特に `listWithAvailabilityFilter`（from/to 指定時の手動ページネーション経路）にも明示的にソートを適用する |
| RES-05 | `name`・`createdAt` フィールドでの NULL は発生しない（エンティティ上 NOT NULL）。`capacity` は NULL 許容のため、capacity 順ソート時は昇順・降順を問わず NULL を常に一覧の最後に表示する |
| RES-06 | `sort` に許可されていないフィールド名、または `asc`/`desc` 以外の方向が指定された場合は `400 VALIDATION_ERROR` を返す（既存の `from`/`to` 同時指定チェックと同じ実装パターン） |

## 非機能要件

| # | 要件 |
|---|------|
| NFR-01 | `listPaginated` 経路（from/to 未指定）は Spring Data JPA の `Pageable.getSort()` 自動適用に乗せる。`listWithAvailabilityFilter` 経路（from/to 指定）は `Comparator<Resource>` を自前で組み立て、手動ページネーション前に適用する |
| NFR-02 | capacity 順ソートの NULL 処理（RES-05）は、H2（テスト環境）・PostgreSQL（本番環境）のいずれでも同一結果になるよう、DB の `ORDER BY` の NULL 既定順序に依存せず Java 側（`listWithAvailabilityFilter` 経路）／明示的な `NULLS LAST` 相当の指定（`listPaginated` 経路）で保証する |
| NFR-03 | 既存の `ResourceServiceTest`・`ResourceControllerTest`（Issue #23 で追加した keyword 関連テストを含む）を壊さない |
| NFR-04 | 不正な `sort` 値のバリデーション（RES-06）は、既存の `ValidationException`／`VALIDATION_ERROR` エラーコードの仕組みをそのまま再利用する |

## 受入条件（ビジネス要求シートより）

- [ ] 名称順（昇順・降順）でリソース一覧を並び替えられる
- [ ] 定員順（昇順・降順）でリソース一覧を並び替えられる
- [ ] ソート未選択時は従来どおり登録日時昇順で表示される
- [ ] カテゴリ・期間フィルタやキーワード検索との組み合わせでもソートが適用される
- [ ] バックエンドの既存テストが引き続き pass する

## 技術コンテキスト（Reverse Engineering 由来）

- `code-structure-resource-sort.md` 参照。ソートが自動適用される経路と、Java 側の明示実装が必要な経路が混在している点が本ユニットの主要な設計判断点
- 前提課題（Issue #23・keyword 検索、PR #132）はこのブランチの基点として取り込み済みであり、`ResourceFilterForm`・`listResourcesAction`・`ResourceService#list` はすでに `keyword` 引数を持つ

## 拡張設定（Requirements Analysis で確認済み）

| Extension | Enabled | 備考 |
|---|---|---|
| Security Baseline | No | ユーザー回答（推奨どおり不採用） |
| Resiliency Baseline | No | ユーザー回答（推奨どおり不採用） |
| Property-Based Testing | No | ユーザー回答（推奨どおり不採用） |

## 確認済みの設計判断（ユーザー回答）

- 不正な `sort` 値 → `400 VALIDATION_ERROR`（RES-06）
- capacity が NULL のリソース → ソート方向に関わらず常に末尾（RES-05・NFR-02）
