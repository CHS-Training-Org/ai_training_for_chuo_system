# Requirements: リソース一覧の検索・フィルタ追加

## Intent Analysis Summary

- **User Request**: 「resource-list-filter の課題を AI-DLC で進めて」（Issue #76）
- **Source of Truth**: `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（RES-01 から RES-04、受入条件 6 項目）
- **Request Type**: Enhancement（既存の UC-02 リソース一覧・空き確認の拡張）
- **Scope Estimate**: Multiple Components（backend と frontend の縦切り 1 本）
- **Complexity Estimate**: Simple から Moderate（既存の一覧が 2 経路あり、両方にキーワード条件を通す必要がある）
- **Requirements Depth**: Standard（要求シートが明確で、確認した曖昧点は 4 件）
- **Brownfield 入力**: `Docs/spec/aidlc-docs/inception/reverse-engineering/` を参照

## Clarification Results

| # | 論点 | 決定 |
|---|------|------|
| Q1 | キーワードに空白を含む場合 | 全体を 1 つの文字列として部分一致（分割しない） |
| Q2 | `%` と `_` の扱い | エスケープしない（LIKE のワイルドカードとして働く） |
| Q3 | 実装方式 | `@Query` のカスタム JPQL |
| Q4 | `keyword` の長さ上限 | 設けない |
| Ext-1 | Security Baseline | 有効にしない |
| Ext-2 | Resiliency Baseline | 有効にしない |
| Ext-3 | Property-Based Testing | 適用しない |

Q2 の帰結：キーワードに `_` を含めると「任意の 1 文字」、`%` を含めると「任意の文字列」として働く。例えば `100%` は「100 で始まる語」にも一致する。SQL インジェクションは起きない（値は JPQL のバインドパラメータで渡すため）。この挙動は仕様書に明記し、テストでは「ワイルドカードとして働く」ことを固定しない（実装の副作用であり保証しない）。

## Functional Requirements

| # | 要件 | 根拠 |
|---|------|------|
| FR-01 | `GET /api/resources` に任意のクエリパラメータ `keyword` を追加し、`resources.name` または `resources.description` への部分一致で絞り込む | RES-01 |
| FR-02 | 比較は大文字・小文字を区別しない（`LOWER` による比較） | RES-02 |
| FR-03 | `keyword` の前後の空白は除去する。除去後に空文字、または未指定の場合は、キーワード条件を適用しない | 受入条件 2、4 |
| FR-04 | 空白を含む `keyword` は分割せず、全体を 1 つの文字列として部分一致させる | Q1 |
| FR-05 | キーワード条件は `category`、`from`/`to`（空き確認）、ロール別の有効無効の絞り込みと AND で組み合わさる。`from`/`to` ありの経路（全件取得して Java で絞り込む経路）にも適用する | RES-04、RE の知見 |
| FR-06 | `ResourceFilterForm` にキーワード入力欄を追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する。空欄で送信すると `keyword` を付けない | RES-03 |
| FR-07 | リソース一覧ページは URL の `keyword` を読み、API 呼び出しに渡す。入力欄の初期値にも反映する。ページ送りで `keyword` が引き継がれる | RES-03、RE の知見 |
| FR-08 | `description` が NULL のリソースでも、`name` が一致すれば結果に含まれる | データモデル（`description` は NULL 可） |
| FR-09 | 検索ロジックは `@Query` の JPQL で実装する | Q3 |

## Non-Functional Requirements

- **後方互換**：`keyword` 未指定時の応答は現状と同一（全件取得）
- **セキュリティ**：認可は現状のまま（全ロール・認証必須）。値はバインドパラメータで渡す。拡張の Security Baseline は適用しない
- **保守性**：4 層構造を守る。`ResourceService.overlaps` など予約の重複判定に使う処理は変更しない
- **品質**：Spotless、Checkstyle、oxlint、oxfmt を通す。既存テストは引き続き pass する
- **性能**：新たな要件なし（空き確認時の全件取得は既存の技術的負債であり、本課題の対象外）

## Out of Scope

- ソート順の選択（後続課題 `resource-list-sort`）
- `location` など `name`・`description` 以外のフィールドの検索
- 複数語の AND 検索、ワイルドカード文字のエスケープ、`keyword` の長さ上限
- 空き確認時の全件取得の性能改善、全文検索

## Acceptance Criteria

シートの受入条件 6 項目をそのまま採用する（真実の源はシート側）。

- [ ] キーワードで絞り込むと、名称または説明にそのキーワードを含む結果のみが表示される
- [ ] キーワード欄を空にして「絞り込む」を押すと、キーワード条件が解除される
- [ ] カテゴリ・期間フィルタとキーワードを同時に指定できる（AND）
- [ ] `keyword` 未指定時の動作は既存と変わらない
- [ ] backend の既存テスト（`ResourceServiceTest` 等）が引き続き pass する
- [ ] 検索ロジックに対応するユニットテストを backend に追加する

## 追加で確認するテスト観点（本ステージの提案）

- 大文字・小文字違い、`description` のみ一致、`description` が NULL、前後空白のみのキーワード
- `from`/`to` あり（空き確認経路）とキーワードの併用、ADMIN の非アクティブ表示とキーワードの併用
- frontend：Server Action が `keyword` を渡すこと（`frontend/tests/unit/server/actions/` の既存テストの有無は Code Generation で確認する）

## Spec Updates Required（Spec-first）

- `docs-next/docs/spec/api-spec.md` §`GET /api/resources`：`keyword` パラメータ、挙動（部分一致、大文字小文字無視、空白除去、ワイルドカード文字の扱い）
- `docs-next/docs/spec/screen-spec.md` §`/resources`：キーワード入力欄
- 反映は `/update-spec` で Code Generation の前に行う
