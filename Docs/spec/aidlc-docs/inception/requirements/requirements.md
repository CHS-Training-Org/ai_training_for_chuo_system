# Requirements: リソース一覧の検索・フィルタ追加

## Intent Analysis Summary
- **User Request**: リソース一覧（`/resources`、`GET /api/resources`）にキーワード検索を追加する（Issue #23、ビジネス要求シート `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`）。
- **Request Type**: Enhancement（既存機能 UC-02 の拡張）
- **Scope Estimate**: Multiple Components（BE の Controller / Service / Repository、FE のフォーム・Server Action・画面、仕様書 2 ファイル）
- **Complexity Estimate**: Simple
- **Requirements Depth**: Standard
- **Project Type**: Brownfield（Reverse Engineering 成果物: `Docs/spec/aidlc-docs/inception/reverse-engineering/`）
- **Scope Note**: STEP-03 の実装（PR #156）は参照せず、トランクのコードから作り直す。

## Functional Requirements

シートの要件 RES-01〜RES-04 を入力とし、確認質問の回答（`requirement-verification-questions.md`）で挙動を確定した。

| ID | 要件 | 出典 |
|----|------|------|
| FR-01 | `GET /api/resources` にクエリパラメータ `keyword`（任意）を追加し、`resources.name` または `resources.description` への部分一致で絞り込む | RES-01 |
| FR-02 | 比較は大文字・小文字を区別しない | RES-02 |
| FR-03 | `ResourceFilterForm` にキーワード入力欄を追加し、「絞り込む」送信時に `keyword` を URL パラメータとして付与する。URL に `keyword` があるとき、入力欄の初期値に反映する | RES-03 |
| FR-04 | `keyword` は `category`、`from`/`to` と AND 条件で組み合わせられる。ADMIN は無効（`is_active = false`）のリソースも検索対象に含め、非 ADMIN は有効なリソースのみを対象とする（既存の一覧と同じ） | RES-04、Q6 の補足 |
| FR-05 | `keyword` の `%` と `_` はリテラル文字として扱う（LIKE のワイルドカードとして解釈しない） | Q1=A |
| FR-06 | `keyword` は前後の空白を除去してから使い、除去後に空なら「キーワード指定なし」として扱う（フィルタを解除する） | Q2=A、受入条件 2 |
| FR-07 | 入力全体を 1 つの文字列として部分一致する。スペース区切りの複数語の分割（AND 検索）はしない | Q3=A |
| FR-08 | `keyword` の最大文字数は制限しない（新たなバリデーションを追加しない） | Q4=A |
| FR-09 | `keyword` 未指定時の動作は既存と変わらない（全件取得） | 受入条件 4 |
| FR-10 | `keyword` を変えて「絞り込む」を押したときは 1 ページ目から表示する（`page` を引き継がない） | 既存フォームの挙動に合わせた確認事項 |
| FR-11 | 仕様書を Spec-first で更新する: `api-spec.md` §`GET /api/resources` に `keyword` と挙動、`screen-spec.md` §`/resources` にキーワード入力欄 | シート「影響範囲」 |

## Non-Functional Requirements
- **互換性**: 既存のクエリパラメータ（`category`、`from`、`to`、`page`、`size`）の挙動とレスポンス形式を変えない。
- **セキュリティ**: キーワードはパラメータバインドで JPQL に渡し、文字列連結で SQL を組み立てない（SQL インジェクションを避ける）。LIKE のエスケープ（FR-05）は検索結果の正しさのためであり、インジェクション対策とは別である。Security Baseline 拡張は適用しない（Q7=B）。
- **データベース互換**: 本番は PostgreSQL、テストは H2。両方で動く JPQL（`LOWER(...) LIKE ... ESCAPE ...` 形式）にする。
- **性能**: 既存と同等でよい（件数の少ない初級課題）。`from`/`to` 指定時の既存経路（全件取得後に Java で重複除外）にも `keyword` を適用する。
- **保守性**: 4 層アーキテクチャを守る。既存の派生クエリは温存し、`@Query`（JPQL）のメソッドを追加する（Q6=B）。
- **耐障害性**: Resiliency Baseline 拡張は適用しない（Q8=B）。

## Test Requirements
- **BE（受入条件）**: 検索ロジックに対応するユニットテストを追加する（`ResourceServiceTest`）。既存テストは引き続き pass する。
- **BE（追加）**: `ResourceControllerTest` に、`keyword` の部分一致、大文字・小文字の無視、`category` / `from`/`to` との AND、空白のみの `keyword`、`%` `_` のリテラル扱いを確認するケースを追加する。
- **FE（Q5=B）**: `listResourcesAction` が `keyword` をクエリパラメータとして渡すことを Vitest で確認する。
- Property-Based Testing 拡張は適用しない（Q9=C）。

## Acceptance Criteria（シートの受入条件を FR に対応づけたもの）

| # | 受入条件 | 対応 |
|---|---------|------|
| 1 | キーワードで絞り込むと、名前または説明にそのキーワードを含む結果のみ表示される | FR-01、FR-02 |
| 2 | キーワードを空にして「絞り込む」を押すと、キーワード条件が解除される | FR-06 |
| 3 | カテゴリ・期間フィルタとキーワードを同時に指定すると AND で絞り込まれる | FR-04 |
| 4 | `keyword` 未指定時の動作は既存と変わらない | FR-09 |
| 5 | 既存の BE テストが pass する | NFR 互換性 |
| 6 | 検索ロジックのユニットテストを BE に追加する | Test Requirements |

## Out of Scope
- 検索対象を `location` など他の列へ広げること
- スペース区切りの複数語検索、あいまい検索、ハイライト表示
- ソート順の選択（別課題 `resource-list-sort`）
- 一覧画面の `ResourceFilterForm` の既存の冗長（未使用の `searchParams`）の整理

## Technical Considerations（Code Generation の入力。設計判断は下記に限る）
- 既存の `ResourceService.list` は、`from`/`to` の有無で「ページネーション付きの派生クエリ」と「全候補取得 + Java で重複除外 + 手動ページネーション」に分かれ、どちらの経路も `isAdmin` と `category` の有無で Repository メソッドを選ぶ。`keyword` を足すと、両経路の Repository メソッド選択に分岐が増える。
- `keyword` が null か空のときは既存メソッドを使い、非空のときだけ新しい `@Query` メソッドを使う設計にすれば、未指定時の挙動を変えずに済む（FR-09）。null を JPQL の `LOWER(:keyword)` に渡すと PostgreSQL で型推論に失敗しやすいため、null を渡さない構成にする。
- LIKE のエスケープ（`\`、`%`、`_` の順で `\` を付与）は Service か専用のユーティリティで行い、JPQL には `ESCAPE '\'` を指定する。エスケープ文字の書き方は PostgreSQL と H2 の両方で確認する。
- `PaginationNav` が `keyword` を含む searchParams をページ遷移で引き継ぐかを、画面で確認する。

## Extension Configuration（回答の記録）

| Extension | Enabled |
|---|---|
| Security Baseline | No（Q7=B） |
| Resiliency Baseline | No（Q8=B） |
| Property-Based Testing | No（Q9=C） |

## Summary of Key Requirements
- BE: `keyword` を `name` / `description` への大文字・小文字無視の部分一致で追加する。`%` `_` はリテラル扱い、前後空白は除去し、空なら解除する。
- FE: フォームに入力欄を追加し、`keyword` を URL と Server Action に通す。
- 仕様書: `api-spec.md` と `screen-spec.md` を実装より先に更新する。
- テスト: BE の Service と Controller、FE の Server Action にテストを追加する。
