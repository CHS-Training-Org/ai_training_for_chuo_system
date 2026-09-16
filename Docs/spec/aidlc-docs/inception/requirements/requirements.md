# Requirements — リソース一覧のキーワード検索追加

## Intent Analysis Summary

- **User Request**: `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（ビジネス要求シート）に基づく開発。リソース一覧にリソース名・説明文への部分一致キーワード検索を追加する。
- **Request Type**: Enhancement（既存機能 UC-02「リソース一覧・空き確認」の拡張）
- **Request Clarity**: Clear。要求シートに RES-01 から RES-04 の要件と6項目の受入条件が明記されている。
- **Scope Estimate**: Multiple Components（backend 3ファイル + そのテスト2ファイル、frontend 3ファイル + そのテスト1ファイル、仕様書2ファイル）
- **Complexity Estimate**: Simple。既存の絞り込み条件に1条件を加える変更であり、新規コンポーネント・データモデル変更・外部依存の追加はない。
- **Requirements Depth**: Standard

## 前提と参照

- 対象ユースケース：UC-02（リソース一覧・空き確認）
- 前提課題：なし
- Reverse Engineering 成果物：`Docs/spec/aidlc-docs/inception/reverse-engineering/`
- 変更が DB スキーマに及ばないため、Flyway マイグレーションの追加はない。

## Functional Requirements

| ID | 要件 | 出典 |
|---|---|---|
| FR-01 | `GET /api/resources` は任意のクエリパラメータ `keyword` を受け付ける | RES-01 |
| FR-02 | `keyword` 指定時、`resources.name` または `resources.description` のいずれかに当該文字列を部分一致で含むリソースのみを返す | RES-01 |
| FR-03 | キーワードの照合は大文字小文字を区別しない | RES-02 |
| FR-04 | `keyword` はカテゴリフィルタ・空き確認期間フィルタと AND 条件で組み合わせられる | RES-04 |
| FR-05 | `keyword` 未指定時の挙動は現行と変わらない（キーワードによる絞り込みを行わない） | 受入条件 |
| FR-06 | `keyword` が空文字または空白のみの場合、未指定と同じ扱いとする（絞り込み解除） | 受入条件「キーワードフィールドを空にして絞り込むと条件が解除される」 |
| FR-07 | `ResourceFilterForm` にキーワード入力フィールドを設け、「絞り込む」送信時に `keyword` を URL パラメータとして付与する | RES-03 |
| FR-08 | 入力済みキーワードは URL から復元され、再読込・共有時にフォームへ反映される | 既存のカテゴリ・期間フィルタと同じ挙動を踏襲 |
| FR-09 | 「リセット」操作でキーワードを含む全フィルタが解除される | 既存挙動の踏襲 |
| FR-10 | ページ送り時にキーワード条件が維持される | 既存の `PaginationNav` がクエリを引き継ぐ仕様の踏襲 |
| FR-11 | ADMIN は無効リソース（`isActive = false`）もキーワード検索の対象に含む。それ以外のロールは有効リソースのみを対象とする | 既存のロール別可視範囲の踏襲 |

### 設計上の確定事項（Reverse Engineering の申し送りに対する決定）

| ID | 決定 | 理由 |
|---|---|---|
| FR-12 | キーワード条件は `ResourceService.list` の**両経路**（`from`/`to` 未指定の DB ページネーション経路と、指定ありの全件取得経路）に適用する | 片方のみでは FR-04 と受入条件「カテゴリ・期間フィルタとキーワードを同時に指定できる」を満たさない |
| FR-13 | 大文字小文字非依存は `LOWER()` による小文字変換比較で実現し、PostgreSQL 固有の `ILIKE` は使わない | テスト DB が H2（PostgreSQL 互換モード）であり、`ILIKE` の受理は DB・Hibernate バージョンに依存する。RES-02 が両方式を許容している |
| FR-14 | `description` が null のリソースも、`name` が一致すれば結果に含める | `description` は NOT NULL 制約を持たない。OR 条件の片側が null で評価されても他方の一致が失われない組み立てとする |
| FR-15 | キーワードに含まれる LIKE のワイルドカード文字（`%`・`_`）およびエスケープ文字はリテラルとして扱う | 利用者が入力した `%` が全件一致として働くと、検索結果が意図から外れる |

## Non-Functional Requirements

| ID | 要件 |
|---|---|
| NFR-01 | 既存のバックエンドテスト（`ResourceServiceTest`・`ResourceControllerTest` 等）が引き続き pass する |
| NFR-02 | 追加した検索ロジックに対応するユニットテストをバックエンドに追加する |
| NFR-03 | フロントエンドの `keyword` 受け渡しに対応するユニットテストを追加する |
| NFR-04 | 既存の lint・format 検証（Spotless / Checkstyle / oxlint / oxfmt）を通過する |
| NFR-05 | 4レイヤーアーキテクチャ（domain / application / presentation / infrastructure）を維持する。検索条件の組み立ては domain 層に置き、application 層が合成する |
| NFR-06 | フロントエンドは Server Components 優先の方針を維持する。キーワード入力はフォーム送信で URL を更新する既存パターンに合わせ、クライアント状態を増やさない |
| NFR-07 | 実装より先に `docs-next/docs/spec/` を更新する（Spec-first） |

### 非目標として明示する事項

- `LIKE '%keyword%'` は前方一致でないため B-tree インデックスを利用できない。全文検索インデックス（`pg_trgm`・`tsvector` 等）の導入は本課題の範囲外とする。学習用リポジトリのデータ規模では実用上の問題にならない。
- `from`/`to` 指定時の手動ページネーション（候補を全件メモリに載せる既存の割り切り）は本課題では改善しない。
- 検索対象に `location` を含めない。要求シートが `name` と `description` に限定している。

## User Scenarios

| # | シナリオ | 期待結果 |
|---|---|---|
| US-01 | 利用者がキーワード「会議」を入力して「絞り込む」を押す | 名称または説明に「会議」を含むリソースのみが表示される |
| US-02 | 利用者がキーワードを空にして「絞り込む」を押す | キーワード条件が解除され、他のフィルタのみが効いた結果になる |
| US-03 | 利用者がカテゴリ「会議室」と期間、キーワードを同時に指定する | 3条件すべてを満たすリソースのみが表示される |
| US-04 | 利用者が大文字小文字を混ぜて入力する（例：`projector` と `Projector`） | どちらでも同じ結果が返る |
| US-05 | 利用者がキーワード指定のまま次ページへ進む | キーワード条件が維持された2ページ目が表示される |
| US-06 | ADMIN が無効リソースの名称でキーワード検索する | 無効リソースがグレーアウト表示で結果に含まれる |
| US-07 | 一般利用者が無効リソースの名称でキーワード検索する | 結果に含まれない |

## Business Context

- **Goal**: リソース件数の増加に伴い目当てのリソースを見つける手間が増えているため、名称・説明文への部分一致検索でリソース一覧の操作性を改善する。
- **Constraints**: 推定工数 2〜3時間。ベースシステムの既存 API と既存フォームのみに依存し、前提課題はない。
- **Success Criteria**: 要求シートの受入条件6項目をすべて満たすこと。
- **後続課題への影響**: 「リソース一覧のソート順選択」が本課題の完了を前提とする。ソート条件の追加が同じ絞り込み経路に乗ることを見越し、条件の追加が容易な構造を選ぶ。

## Technical Context

- **Integration Points**: フロントエンドの Server Actions とバックエンド REST API の間の契約。API 契約は Zod スキーマとして手書きで二重管理されているため、両側を同じ変更単位で更新する（縦切り）。
- **Data Requirements**: スキーマ変更なし。既存の `resources.name`・`resources.description` を検索対象とする。
- **System Boundaries**: 管理者向けのリソース管理画面（`ResourceManagementClient.tsx`）は本課題の範囲外。

## Quality Attributes

- **Testability**: `ResourceServiceTest` は Mockito の strict stubs を使うため、一覧経路のリポジトリ呼び出しを変更すると既存スタブが未使用となり `UnnecessaryStubbingException` を起こす。一覧系テストの書き換えは本変更に不可分な作業であり、スコープ拡大ではない。同様に `ResourceControllerTest`（新規クエリパラメータ）と `frontend/tests/unit/server/actions/resources.test.ts`（`keyword` 受け渡し）も更新対象となる。
- **Maintainability**: 現行の `ResourceRepository` は条件の組み合わせごとに派生クエリメソッドを増やす構造であり、キーワードを素朴に追加すると6メソッドが12に増える。後続のソート課題も同じ経路に乗るため、条件を動的に合成できる構造を選ぶ。
- **Accessibility**: キーワード入力に `Label` を関連付け、既存のフィルタ項目と同じ構造にする。

## 確認質問への回答

`.claude/rules/aidlc-questions.md` に従い、質問ファイル方式ではなく `AskUserQuestion` で確認した。

| 質問 | 回答 | 影響 |
|---|---|---|
| キーワード条件の組み立て方式（JPA Specification か `@Query` か） | **JPA Specification** | `Specification<Resource>` で有効フラグ・カテゴリ・キーワードを動的合成し、`findAll(spec, pageable)` と `findAll(spec)` で `list` の両経路をまかなう。既存の派生クエリメソッド6個を増やさずに済み、Criteria API の `cb.lower()` により FR-13 が構造的に満たされる |
| Security Baseline 拡張 | いいえ | 認証・認可境界の内側に閉じる変更であるため。LIKE パターンのエスケープ（FR-15）は通常の実装として行う |
| Resiliency Baseline 拡張 | いいえ | 読み取り専用のパラメータ追加であり、新たな障害点・外部依存・状態を持ち込まないため |
| Property-Based Testing 拡張 | いいえ | 追加ロジックは述語の合成でありアルゴリズム的複雑さがない。受入条件が例示ベースで列挙されているため、既存の JUnit + Mockito の例示テストで直接対応づけて検証できる |

## Summary

リソース一覧に大文字小文字を区別しない部分一致キーワード検索を追加する。バックエンドは JPA Specification で有効フラグ・カテゴリ・キーワードの述語を動的合成し、`ResourceService.list` の2経路の双方に同じ条件を適用する。フロントエンドは既存の URL searchParams ベースのフィルタ機構にキーワード入力を1項目加える。スキーマ変更と新規コンポーネントはなく、実装前に `api-spec.md` と `screen-spec.md` を更新する。
