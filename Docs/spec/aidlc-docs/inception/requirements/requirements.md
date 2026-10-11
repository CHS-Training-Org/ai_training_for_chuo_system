# Requirements: リソース一覧の検索・フィルタ追加（Issue #23）

## Intent Analysis Summary

- **User Request**: Issue #23「リソース一覧の検索・フィルタ追加」。ビジネス要求シート `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md` を前提に AI-DLC で開発する
- **Request Type**: Enhancement（UC-02 リソース一覧・空き確認の拡張）
- **Scope Estimate**: Multiple Components（backend と frontend の縦切り + spec 2 ファイル）
- **Complexity Estimate**: Simple〜Moderate（API に任意パラメータ 1 つ追加。ただしリポジトリ設計と実クエリのテスト方針に判断あり）
- **Requirements Depth**: Standard
- **Extensions**: Security Baseline = No / Resiliency Baseline = No / Property-Based Testing = No

## Functional Requirements

シートの RES-01〜04 を正とし、確認質問の回答と下記「確定した解釈」で補う。

| ID | 要件 |
|----|------|
| RES-01 | `GET /api/resources` に任意のクエリ `keyword` を追加し、`resources.name` または `resources.description` への部分一致で絞り込む |
| RES-02 | 検索は大文字・小文字を区別しない |
| RES-03 | `ResourceFilterForm` にキーワード入力欄を追加し、「絞り込む」送信時に `keyword` を URL パラメータへ付与する |
| RES-04 | 既存の `category`・`from`/`to` と AND で組み合わせられる |

### 確定した解釈（回答および既存仕様からの導出）

- **複数語（回答）**: trim 後の入力全体を 1 つの文字列として部分一致させる（空白分割・AND はしない）
- **空・空白のみ**: 条件なし（全件）として扱う。FE は空なら `keyword` を URL に付与しない
- **name / description は OR**: どちらかに一致すればヒット。description が NULL のリソースは name のみで判定
- **ロール別可視性は不変**: ADMIN は inactive 含む、それ以外は active のみ。keyword はその範囲内で絞り込む
- **from/to 経路でも有効**: 空き確認と同時指定した場合、候補取得段階で keyword を適用してから占有除外・ページングする

### 仮定（承認時に異論があれば指摘してください）

- **A1 ページ**: 既存 `ResourceFilterForm` のフィルタ送信時の挙動を踏襲する（`handleSubmit` は `page` を URL に含めないため、送信すると先頭ページから表示される）。根拠は既存実装のみで、シート・spec には記述がない
- **A2 見出し**: フォームの既存の見出し「フィルタ・空き確認」を維持する（根拠: `ResourceFilterForm.tsx` の既存実装）

## Non-Functional Requirements

- **後方互換**: `keyword` 未指定時の挙動・レスポンス形式は現状と同一
- **性能**: 現行規模（リソース数十〜数百件）で既存と体感差がないこと。DB インデックス追加はしない（Flyway マイグレーションなし）
- **保守性**: `ResourceRepository` の一覧取得パターンの組合せ爆発（現 8 通り = 派生クエリ 6 本 + `JpaRepository` 継承の `findAll` 2 本）を悪化させない設計にする。具体策（`Specification` / `@Query`）は Application Design で決定
- **DB 互換**: PostgreSQL（本番）と H2（テスト）の両方で動く比較方式を選ぶ（ILIKE 非依存の小文字化比較などを設計で検証）
- **セキュリティ/Resiliency/PBT**: 拡張は適用しない。ただし SQL インジェクションを避けるためバインドパラメータを使い、文字列連結でクエリを組まない
- **規約**: 4 層アーキテクチャ厳守、Server Components 優先、Conventional Commits、Spotless / Checkstyle / oxlint / oxfmt を通す

## Acceptance Criteria（シート準拠）

- [ ] キーワードで絞り込むと、name または description に含む結果のみが表示される
- [ ] キーワードを空にして「絞り込む」を押すと条件が解除される
- [ ] カテゴリ・期間とキーワードを同時指定でき AND で絞り込まれる
- [ ] `keyword` 未指定時の動作は既存と変わらない
- [ ] 既存の BE テスト（`ResourceServiceTest` 等）が引き続き pass する
- [ ] 追加した検索ロジックの BE ユニットテストを追加する

### テスト方針（RE の所見を反映）

- Service は Mockito 主体のため、**実クエリの部分一致・大文字小文字・NULL description は Repository 層の統合テスト（H2、`@DataJpaTest` 想定）で検証する**。実装方式の詳細は Code Generation の計画で確定する
- Service / Controller テストに keyword の受け渡し・AND 組み合わせを追加
- FE は `listResourcesAction` の `keyword` 付与の Vitest ケースを追加。フォーム入力は既存のテスト様式に合わせる

## 設計上の検討事項（Application Design で確認する）

要件としては規定しない。シート・api-spec・既存実装のいずれにも記述がないため、設計段階で扱いを確認・決定する。

- **`%` と `_` の扱い**: `keyword` に含まれる `%`（任意文字列）・`_`（任意 1 文字）を、LIKE のワイルドカードとして働かせるか、通常の文字として検索するか。実装方式（`Specification` / `@Query` / 派生クエリ）によって既定の挙動が異なるため、方式選定と合わせて決める。決定内容は api-spec の `keyword` 仕様に反映し、Repository 統合テストで検証する
- **キーワード入力欄の UI 文言**: ラベル・プレースホルダ等の文言。シート（RES-03 は「キーワード入力フィールド」のみ）・screen-spec・既存実装のいずれにも指定がない。必要であれば、既存ラベル（「カテゴリ」「開始日時」「終了日時」）との整合を踏まえて検討し、決定内容を screen-spec §`/resources` に反映する

## Impact（更新対象）

- **Spec（Spec-first・Code Generation より前に `/update-spec` で統合）**: `docs-next/docs/spec/api-spec.md` §`GET /api/resources`（`keyword` の仕様）、`docs-next/docs/spec/screen-spec.md` §`/resources`（キーワード入力欄）
- **Backend**: `ResourceController` / `ResourceService` / `ResourceRepository` と各テスト
- **Frontend**: `resources/page.tsx`（SearchParams に `keyword`）/ `ResourceFilterForm.tsx` / `server/actions/resources.ts` と Vitest
- **対象外**: ソート順選択（別課題 `resource-list-sort`）、`from`/`to` 経路のメモリ処理の改善、OpenAPI クライアント自動生成、DB スキーマ変更

## 前提・リスク

- 後続課題 `resource-list-sort` が本課題を前提にするため、`keyword` のクエリ名・挙動は api-spec に明記して固定する
- Repository の設計次第で既存クエリの置き換えが発生する。既存テストを壊さないことを受入条件で担保する
