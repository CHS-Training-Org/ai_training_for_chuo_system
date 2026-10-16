# Requirements: リソース一覧の keyword 検索追加

## Intent Analysis
- **User Request**: `/aidlc` でシート `resource-list-filter` を実装する
- **Request Type**: Enhancement
- **Scope Estimate**: Multiple Components（BE と FE）
- **Complexity Estimate**: Simple〜Moderate
- **Depth**: Standard
- **入力**: `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（RES-01〜04 と受入条件）、Reverse Engineering 成果物、質問ファイルの回答

## Functional Requirements
| # | 要件 | 出典 |
|---|------|------|
| FR-01 | `GET /api/resources` に任意の `keyword` を追加し、`resources.name` または `resources.description` への部分一致で絞り込む | RES-01 |
| FR-02 | 大文字・小文字を区別しない | RES-02 |
| FR-03 | `ResourceFilterForm` にキーワード入力欄を追加し、「絞り込む」送信時に `keyword` を URL パラメータへ付与する。空のときは付与しない（条件解除） | RES-03 |
| FR-04 | `category`・`from`/`to`・`keyword` は AND 条件で組み合わせる。ADMIN は inactive を含み、それ以外は active のみ（既存どおり） | RES-04 |
| FR-05 | `keyword` 未指定時の挙動は既存と同一（全件） | 受入条件 |
| FR-06 | `keyword` 前後の空白は除去し、全体を 1 つの部分一致文字列として扱う。除去後に空なら未指定と同じ | Q2=A |
| FR-07 | `%`・`_`・エスケープ文字はリテラルとして検索する（LIKE のエスケープ処理） | Q1=A |
| FR-08 | `keyword` は 100 文字まで。超過は `400 VALIDATION_ERROR` | Q3=A |
| FR-09 | `from`/`to` 指定時の経路（Java 側で空き判定後に手動ページング）でも `keyword` を適用する | FR-04 |
| FR-10 | `keyword` 指定で 0 件のとき、「キーワード『○○』に一致するリソースがありません。」のように条件を示すメッセージを出す | Q5=B |

## Non-Functional Requirements
- **保守性**: BE は JPA `Specification` で category・isActive・keyword を動的に組み合わせ、派生クエリの組合せ爆発を解消する（Q4=A。最終確定は Application Design）。後続の `reservation-list-filter`・`resource-list-sort` が条件を足しやすい構造にする。
- **一貫性**: 4 レイヤー構造を守る。FE は Server Components 優先で、絞り込み状態は URL パラメータで持つ（既存方式）。
- **セキュリティ**: 拡張ルールは適用しない（Q7=B）。ただし入力値の検証（FR-07・FR-08）は通常の品質として実施する。

## Test Requirements
- BE: `ResourceServiceTest` と `ResourceControllerTest` に keyword のケースを追加する（部分一致、大文字小文字、name/description、ワイルドカード文字、空白のみ、101 文字、category・from/to との AND、ADMIN と非 ADMIN）。既存テストは引き続き pass。
- FE: `resources.test.ts` に `keyword` が query に渡ることを追加する（Q6=B）。E2E は対象外。
- 検証コマンド: `./gradlew test`、`pnpm test`、`pnpm lint`、`./gradlew spotlessApply` / `checkstyleMain`。

## Spec Updates（Spec-first、実装より先）
- `docs-next/docs/spec/api-spec.md` §`GET /api/resources`: `keyword` を追記
- `docs-next/docs/spec/screen-spec.md` §`/resources`: キーワード入力欄と 0 件メッセージを追記
- 統合は `/update-spec` で Code Generation より前に行う

## Extension Configuration
| Extension | Enabled |
|---|---|
| Security Baseline | No |
| Resiliency Baseline | No |
| Property-Based Testing | No |

## Out of Scope
- ソート（`resource-list-sort`）、予約一覧の `resourceName` 検索（`reservation-list-filter`）、E2E 追加、DB インデックス追加、全文検索
