# Requirements — リソース一覧の検索・フィルタ追加

## Intent Analysis Summary

- **User Request**: Issue #76 / `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（リソース一覧の検索・フィルタ追加）に基づき、`/aidlc` でこのエンハンス課題を実装する。
- **Request Type**: Enhancement（既存機能の拡張）
- **Scope Estimate**: Multiple Components（backend: presentation/application/domain 3層 + frontend: フォーム・Server Action・ページ）
- **Complexity Estimate**: Simple〜Moderate（機能自体は単純だが、既存の派生クエリメソッド方式からの設計転換を伴う）
- **Depth**: Standard（要件は明確だが、実装方式・大文字小文字比較・特殊文字・空白・インデックスの5点で未決定事項があり、全て `AskUserQuestion` で解消済み）

## Functional Requirements

| # | 要件 | 出典 |
|---|------|------|
| FR-01 | `GET /api/resources` にクエリパラメータ `keyword`（任意）を追加し、`resources.name` または `resources.description` への部分一致で結果を絞り込む | RES-01（エンハンス課題） |
| FR-02 | `keyword` 検索は大文字・小文字を区別しない。比較は `LOWER(column) LIKE LOWER(CONCAT('%', :keyword, '%'))` 方式を用いる（H2/PostgreSQL 両対応のため `ILIKE` は使わない） | RES-02 + 確認質問「大文字小文字」 |
| FR-03 | `keyword` 内に含まれる SQL LIKE ワイルドカード文字（`%`, `_`）はリテラル文字としてエスケープしてから比較する | 確認質問「特殊文字」 |
| FR-04 | `keyword` が空文字列、または trim 後に空文字列になる場合（空白のみ入力）は、`keyword` 条件を適用しない（未指定時と同じ全件対象の扱い） | 受入条件 + 確認質問「空白文字」 |
| FR-05 | `ResourceFilterForm` にキーワード入力フィールドを追加する。送信時、入力値をそのまま（trim せずクライアント側では無加工で）`keyword` クエリパラメータとして URL に付与する。バックエンド側（FR-04）で trim・空文字判定を行う | RES-03 |
| FR-06 | 既存のカテゴリフィルタ・空き確認期間フィルタ（`from`/`to`）と `keyword` は AND 条件で組み合わせられる。`category`/`isActive`/`from`・`to` に基づく既存の絞り込みロジック（`ResourceService.list` / `fetchAllCandidates`）に `keyword` 条件を追加する形で実装する | RES-04 |
| FR-07 | `keyword` 未指定時の挙動は現行と変わらない（全件取得、既存のページネーション・空き確認フィルタのみ） | 受入条件 |

## Non-Functional Requirements

| # | 要件 | 出典 |
|---|------|------|
| NFR-01 | 検索ロジックは Spring Data の派生クエリメソッドの追加ではなく、`@Query` によるカスタム JPQL で実装する。`category`/`isActive`/`keyword` を全て null 許容のパラメータとして JPQL 内の `AND (:param IS NULL OR ...)` パターンで組み合わせ、既存の派生メソッドの組み合わせ爆発を避ける | 確認質問「検索実装方式」 |
| NFR-02 | `resources.name` / `resources.description` への検索用インデックスは本タスクのスコープに含めない（データ量がチュートリアル規模であり、受入条件にも性能要件の記載がないため）。将来的な性能劣化時の改善候補として `code-quality-assessment.md` に記録済み | 確認質問「インデックス」 |
| NFR-03（Security Baseline, SECURITY-05） | `keyword` パラメータは最大長を設け（他の文字列入力パラメータとの一貫性を踏まえ 200 文字程度を上限の目安とする。具体値は Code Generation 時に既存の DTO バリデーション方針と合わせて決定する）、パラメータ化クエリ（`@Param`）のみを使用し、文字列連結による JPQL 組み立ては行わない。これは blocking 項目として Code Generation 完了時に compliant/non-compliant を明示する | Security Baseline opt-in（適用する） |

## Extension Configuration（本タスクへの適用結果）

| Extension | Enabled | 本タスクへの適用範囲 |
|---|---|---|
| Security Baseline | Yes | 新規エンドポイント・新規データストアを伴わないため、15ルール中 SECURITY-05（入力バリデーション）のみが直接関連。他ルールは N/A（既存の認証・インフラ構成を変更しないため） |
| Resiliency Baseline | No | 本タスクでは適用しない |
| Property-Based Testing | No | 本タスクでは適用しない |

## User Scenarios

- **主シナリオ**: 会員がリソース一覧画面でキーワード（例：「会議室」）を入力して絞り込むと、`resources.name` または `description` に該当文字列を含むリソースのみが一覧に表示される。
- **カテゴリ・期間との併用**: 会員がカテゴリ（例：`ROOM`）・期間（`from`/`to`）・キーワードを同時に指定すると、3条件すべてを満たすリソースのみが表示される（AND 条件）。
- **条件解除**: キーワード欄を空にして再度絞り込むと、キーワード条件のみが解除され、カテゴリ・期間条件は維持される。
- **エッジケース（特殊文字）**: 会員が「50%」のような `%` を含む文字列で検索しても、ワイルドカードとしてではなくリテラル文字列として扱われ、意図しない広範囲マッチは発生しない。
- **エッジケース（空白のみ）**: 会員が誤って半角スペースのみを入力して送信しても、未入力時と同じ挙動（全件対象）になる。
- **管理者シナリオ**: ADMIN がキーワード検索を行った場合も、既存の `is_active=false` を含む可視性ルールは維持される。

## Business Context

- **Goals**: リソース数増加に伴う検索性の向上（エンハンス課題「背景」節に既出）。
- **Constraints**: 推定工数 1日（Issue #76）。既存の4層アーキテクチャ・Repository 命名規約からの逸脱は最小限に留める。
- **Success Criteria**: エンハンス課題の受入条件（6項目）をすべて満たし、既存の `ResourceServiceTest` / `ResourceControllerTest` が pass し続けること。

## Technical Context

- **Integration Points**: `GET /api/resources`（既存エンドポイントへのパラメータ追加のみ、新規エンドポイントなし）
- **Data Requirements**: 新規カラム・新規テーブルなし。既存の `resources.name` / `resources.description` を対象とする
- **System Boundaries**: 変更は backend の `presentation/application/domain`（`ResourceController`/`ResourceService`/`ResourceRepository`）と frontend の `ResourceFilterForm.tsx`・`frontend/src/server/actions/resources.ts`・`frontend/src/app/(authenticated)/resources/page.tsx` に閉じる。管理画面側（`admin/resources/`）は対象外

## Quality Attributes

- **Reliability**: 既存の空き確認フィルタ（Java 側での重複除外・手動ページネーション）との実行順序整合（DB 側で keyword/category/isActive を絞り込んでから候補取得→Java 側で占有除外→手動ページング）を維持する
- **Maintainability**: `@Query` の null 許容条件パターンはコードコメントではなくテストで意図を示す（ADR-018 の命名規約に従ったテストケースで null/値ありの組み合わせを網羅）
- **Testability**: 新規検索ロジックに対するユニットテスト（`ResourceServiceTest` への追加）と、既存の結合テスト（`ResourceControllerTest`）の回帰確認が受入条件に含まれる
- **Accessibility**: キーワード入力フィールドには `label` を適切に関連付ける（既存の `ResourceFilterForm` の他フィールドと同様のパターンを踏襲）

## Summary（要点）

本タスクはリソース一覧（`/resources`）へのキーワード検索追加であり、スコープは小さいが唯一の設計判断は検索ロジックの実装方式である。確認の結果、既存の派生クエリメソッド方式から `@Query` カスタム JPQL への切り替えが採用された。大文字小文字非区別は `LOWER()`、ワイルドカードはエスケープ、空白のみは無条件扱い、インデックス追加は対象外と決定済み。Security Baseline 拡張が適用され、入力バリデーション（SECURITY-05）が Code Generation 完了時の blocking 確認項目となる。
