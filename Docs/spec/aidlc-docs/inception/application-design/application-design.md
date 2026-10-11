# Application Design（統合版）: リソース一覧の検索・フィルタ追加（Issue #23）

詳細は同ディレクトリの `components.md` / `component-methods.md` / `services.md` / `component-dependency.md` を参照。

## 設計判断

| 論点 | 決定 | 反映先 |
|------|------|--------|
| `%` と `_` | 通常の文字として検索（LIKE エスケープ）。`\` も同様にエスケープする | api-spec の `keyword` 仕様、Repository 統合テスト |
| Repository 方式 | Specification（`JpaSpecificationExecutor`）。一覧取得 8 通り（派生クエリ 6 本 + 継承 `findAll` 2 本）を集約し、派生クエリ 6 本は削除 | `ResourceRepository`、`ResourceServiceTest` のモック更新 |
| keyword 正規化 | Service で trim。空・空白のみは条件なし | `ResourceService`、Service テスト |
| UI 文言 | ラベル「キーワード」、プレースホルダ「名称・説明で検索」。見出し「フィルタ・空き確認」は維持 | screen-spec §`/resources` |

## 構成の要点

- 新規は `ResourceSpecifications`（domain）のみ。4 層・Flyway・スキーマは変更しない
- 通常経路と空き確認経路の両方で、同じ Specification を使う
- 大文字小文字無視は lower(列) LIKE lower(パターン) で実現し、PostgreSQL と H2 の両方で動かす
- バインドパラメータを使い、文字列連結でクエリを組まない

## 影響とレビュー観点

- **既存テストへの影響**: 受入条件「既存の BE テストが引き続き pass」は、次のとおり解釈する。
  - `ResourceServiceTest` の既存アサーション（返却件数・ID・占有除外・隣接は非重複）は変更しない
  - 許容する変更は 2 点のみ。(1) `list(...)` への `keyword` 引数追加に伴うコンパイル追従、(2) スタブ対象を `findByIsActiveTrue(pageable)` / `findAll(pageable)` / `findByIsActiveTrue()` から `findAll(any(Specification.class), ...)` へ置き換えること
  - **テスト観点の担保層が移る**: 従来はスタブするメソッドの違いで「active のみ」と「全件」を区別していた。`Specification` は不透明なため、置換後の Service モックテストでは可視性を区別できない。ロール別可視性・from/to 除外は、実 DB を使う `ResourceControllerTest`（`@SpringBootTest` + H2）と、新設する Repository 統合テストで担保する
- **代替案**: 派生クエリを残して keyword 指定時のみ Specification を使う案もあるが、経路が二重になり保守性要件に反するため採らない
- **テスト**: Specification の実クエリは Repository 層の統合テスト（H2）で検証する。`@DataJpaTest` は現状どこにもないため新設する（既存の `application-test.yml`、H2 `MODE=PostgreSQL` を流用）。方式の詳細は Code Generation の計画で確定する
- **Code Generation への申し送り（統合テストで検証する項目）**:
  - H2 で TEXT 列（`description`、`columnDefinition = "TEXT"`）に対する `lower()` と `LIKE ... ESCAPE` が期待どおり動くか（未確認）
  - 部分一致、大文字小文字の無視、`description` が NULL の行、`%` `_` `\` のリテラル扱い
  - 非 ADMIN の active 限定、ADMIN の全件（条件なしの `unrestricted()`）、category・keyword の AND
