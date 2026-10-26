# Code Generation Plan: resource-keyword-search

この計画が Code Generation の唯一の正である。承認後はステップの順に実行し、完了したステップを直ちに `[x]` にする。計画から外れる必要が出たときは、実装を止めて計画の変更を提示する。

## Unit Context
- **Unit**: `resource-keyword-search`（Units Generation はスキップ。Issue #23 の単一の縦切り）
- **Stories**: User Stories はスキップ。トレーサビリティは要件 ID（`requirements.md` の FR-01〜FR-11）と受入条件 1〜6 で取る。
- **Workspace Root**: `/workspace`（Brownfield。既存ファイルはすべてその場で修正し、コピーを作らない）
- **Dependencies**: 他ユニットなし。DB スキーマと Flyway マイグレーションは変更しない。
- **Interface**: `GET /api/resources?keyword=...`（任意パラメータ。未指定時は既存の挙動）
- **Entities**: `Resource`（`name`、`description`）。変更なし。
- **Local build の制約**: DevContainer の `docs-next` には docusaurus が入っておらず `npm run build` は exit 127 で失敗する。docs のビルド確認はローカルでは行わず、PR の CI（Docs Check / build）に任せる。
- **文章規範**: `docs-next/docs/` の Markdown を書くときは `docs-next/CLAUDE.md` に従う（`spec/` はである調、表のセルは常体でよい）。

## 設計方針（このユニットで採る実装方式。承認の対象に含む）

要件の Q6=B（`@Query` で追加）に沿った具体化である。

1. **Repository**: `keyword` ありの取得は、`Sort` を受け取る `List` 返却の `@Query` を 4 つ追加する（ADMIN / 非 ADMIN × カテゴリ指定の有無）。`Pageable` 版は作らない。null を JPQL に渡さないために、カテゴリの有無はメソッドを分けて表す。
2. **Service**: `keyword` が非空のときは、`List` 取得 -> （`from`/`to` があれば）重複予約の除外 -> 手動ページネーション、の順で処理する。除外とページネーションは既存の `listWithAvailabilityFilter` の処理を共通化して再利用する。並び順は `pageable.getSort()` を `List` 取得に渡して保つ。`keyword` が空のときは既存の経路をそのまま通す（FR-09）。
3. **正規化とエスケープ**: Service が前後空白を除去し、空なら null 扱いにする（FR-06）。LIKE の特殊文字は、エスケープ文字 `!` を使って `!`、`%`、`_` の順にエスケープし、小文字化して `%...%` を作る（FR-02、FR-05）。JPQL は `LOWER(r.name) LIKE :pattern ESCAPE '!'` の形にする。`requirements.md` の Technical Considerations は `\` を例示していたが、Java、JPQL、PostgreSQL、H2 の 4 層でバックスラッシュの二重解釈を避けるために `!` を選ぶ。
4. **Service のシグネチャ**: `list(category, from, to, isAdmin, keyword, pageable)` を追加し、既存の 5 引数版は `keyword = null` で委譲する形で残す。既存テストの呼び出しを変更せずに済み、受入条件 5 を文字どおり満たせる。
5. **FE**: `keyword` は前後空白を除去してから、空でなければ URL に付与する。入力欄の初期値は URL の `keyword` から復元する。

この方針を変えたい場合（例: Service の 5 引数版を残さず呼び出し側を更新する、`Pageable` 版の `@Query` を追加する）は、承認時に指示してほしい。

## Steps

### Part A: 仕様書（Spec-first）
- [x] **Step 1**: `/update-spec` を起動し、更新対象を特定する（`docs-next/docs/spec/api-spec.md` と `screen-spec.md` の該当節。`requirements.md` への追記要否もここで判定する）。
  - 判定: 更新対象は `api-spec.md` と `screen-spec.md` の 2 ファイル。`docs-next/docs/spec/requirements.md`（UC-02）は変更しない。シートの「更新が必要な spec」に含まれず、既存の `RES-01`〜`RES-08` とシートの `RES-01`〜`RES-04` が ID として衝突するため、要件表への追記は別途整理が要る。判断を仰ぐ点として最後の要約に記載する。
- [x] **Step 2**: `docs-next/docs/spec/api-spec.md` §`GET /api/resources`（リソース一覧）を更新する。
  - クエリパラメータ表に `keyword`（string、任意）を追加する。
  - 補足に、`name` と `description` への大文字・小文字を区別しない部分一致、前後空白の除去、空なら条件なし、`%` と `_` はリテラル扱い、`category`・`from`/`to` との AND、ADMIN は無効なリソースも対象、を記述する。
  - 一覧表（エンドポイント概要）の説明を「カテゴリ・キーワード・空き日時でフィルタ可」に改める。
  - FR-01、FR-02、FR-04〜FR-09 に対応する。
- [x] **Step 3**: `docs-next/docs/spec/screen-spec.md` §`/resources` の UI 要素表に「キーワード入力欄」の行を追加する（送信は「絞り込む」、空にして送信すると解除、URL の `keyword` から初期値を復元）。FR-03、FR-10 に対応する。
- [x] **Step 4**: 更新した 2 ファイルの `frontmatter`（`last_updated` など既存の更新日の項目）と、表や見出しの整形を確認する。ローカルでの `npm run build` は行わない（上記の制約。CI の Docs Check / build で確認する）。

### Part B: バックエンド（Repository -> Service -> Controller）
- [x] **Step 5**: `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` に、`keyword` 用の `@Query` メソッドを 4 つ追加する。
  - 条件は `(LOWER(r.name) LIKE :pattern ESCAPE '!' OR LOWER(r.description) LIKE :pattern ESCAPE '!')`。
  - ADMIN 用はカテゴリ指定あり・なし、非 ADMIN 用は `r.isActive = true` を加えたカテゴリ指定あり・なし。
  - いずれも `Sort` を引数に取り `List<Resource>` を返す。Javadoc に用途（`keyword` 指定時の候補取得）を書く。
  - 既存メソッドは変更しない。
- [x] **Step 6**: `backend/src/main/java/com/example/bookflow/application/ResourceService.java` を修正する。
  - `list` の 6 引数版を追加し、5 引数版は `keyword = null` で委譲する。
  - 正規化（trim、空は null）と LIKE パターン生成（エスケープと小文字化）を private メソッドで実装する。
  - `keyword` ありの経路を実装する。重複予約の除外と手動ページネーションは、既存の `listWithAvailabilityFilter` から共通部分を取り出して両経路で使う。`keyword` なしの経路の挙動は変えない。
  - Javadoc を更新する。
- [x] **Step 7**: `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` の `list` に `@RequestParam(required = false) String keyword` を追加し、Service の 6 引数版を呼ぶ。Javadoc の `@param` とクラス Javadoc の説明を更新する。
- [x] **Step 8**: `./gradlew spotlessApply` で整形し、`./gradlew compileJava` でコンパイルが通ることを確認する。

### Part C: バックエンドのテスト
- [x] **Step 9**: `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` に `keyword` のテストを追加する（Mockito）。確認する観点:
  - 非空の `keyword` で `keyword` 用の Repository メソッドが呼ばれ、既存メソッドは呼ばれない。
  - 前後空白が除去され、小文字化される。空白のみは「指定なし」となり既存メソッドが使われる。
  - `%`、`_`、`!` がエスケープされたパターンが渡される。
  - ADMIN と非 ADMIN で呼ぶメソッドが分かれる。カテゴリ指定の有無でも分かれる。
  - `from`/`to` と併用したとき、占有予約のあるリソースが除外される（AND）。
  - 手動ページネーションの `totalElements` と `content`。
- [x] **Step 10**: `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` に結合テストを追加する（H2。実際の JPQL を実行する）。確認する観点:
  - `name` の部分一致と `description` の部分一致。
  - 大文字・小文字を区別しない。
  - `category` との AND、`from`/`to` との AND。
  - 空白のみの `keyword` で全件が返る。
  - `%` と `_` を含む `keyword` がリテラルとして扱われる（`%` だけで全件ヒットしない）。
  - ADMIN は無効なリソースもヒットし、MEMBER はヒットしない。
  - `description` が null のリソースで例外にならない。
  - JPQL の `LIKE ... ESCAPE` と `LOWER` が H2 で動く（`description` は `TEXT`）。
- [x] **Step 11**: `./gradlew test --tests "*ResourceServiceTest"` と `./gradlew test --tests "*ResourceControllerTest"` を実行し、続けて `./gradlew test`（全件）と `./gradlew checkstyleMain` を実行する。失敗したら、原因を調べて修正する。テストを緩めて通すことはしない。

### Part D: フロントエンド
- [x] **Step 12**: `frontend/src/server/actions/resources.ts` の `ListResourcesParams` に `keyword?: string` を追加し、指定があれば `queryParams.keyword` に付与する。他の呼び出し元（`reservations/new/page.tsx`、`admin/resources/page.tsx`）は `keyword` を渡さないため変更しない。
- [x] **Step 13**: `frontend/src/app/(authenticated)/resources/page.tsx` の `SearchParams` に `keyword?: string` を追加し、Action に渡し、`ResourceFilterForm` の `defaultKeyword` に渡す。
- [x] **Step 14**: `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` にキーワード入力欄を追加する。
  - `Label` と `Input`（`name="keyword"`、`id="keyword"`）を既存のカテゴリ・期間の欄と同じパターンで置く。1 行目に全幅で配置する。
  - `data-testid="resource-filter-keyword-input"` を付ける（自動化しやすい UI の規則）。
  - 送信時は前後空白を除去し、空でなければ `keyword` を付与する。`page` は付与しない（1 ページ目から表示）。
  - `defaultKeyword` を入力欄の初期値にする。
  - 既存の冗長（未使用の `searchParams`）は触らない。
- [x] **Step 15**: `frontend/tests/unit/server/actions/resources.test.ts` に、`keyword` を渡したときに `/api/backend/resources` へクエリパラメータ `keyword` が送られること、渡さないときは送られないことを確認する Vitest を追加する（MSW のハンドラで受け取ったリクエスト URL を検査する）。
- [x] **Step 16**: `PaginationNav` が `keyword` を含む searchParams をページ遷移で引き継ぐことを、コードと既存テスト（`pagination-nav.test.ts`）で確認する。引き継がない場合は、計画の変更として報告する。
- [x] **Step 17**: `pnpm format`（`oxfmt`）で整形し、`pnpm lint`、`pnpm test`、`pnpm format:check` を実行する。

### Part E: 要約と記録
- [x] **Step 18**: 重複ファイル（`*_modified.*` など）が作られていないことを確認する（`git status`）。
- [x] **Step 19**: 実装の要約を `Docs/spec/aidlc-docs/construction/resource-keyword-search/code/code-summary.md` に作成する（変更・作成したファイル、設計方針からの差分、実行したコマンドと結果、確認できなかったこと）。アプリケーションコードは置かない。
- [x] **Step 20**: `Docs/spec/aidlc-state.md` と `Docs/spec/aidlc-audit.md` を更新し、2 択の完了メッセージ（Request Changes / Continue to Build & Test）を提示して承認ゲートで止まる。

## 含めないもの
- 検索結果が 0 件のときの専用メッセージ（要件にないため）。必要なら承認時に指示してほしい。
- E2E テスト（Playwright）。受入条件と Q5 の範囲外。
- コミットと push、PR の作成。`/commit-push` と `/create-pr` で別途行う。
- DB マイグレーションとインデックスの追加。

## 要件との対応

| 要件・受入条件 | ステップ |
|---|---|
| FR-01、FR-02、FR-05〜FR-08 | 5、6、9、10 |
| FR-03、FR-10 | 3、14 |
| FR-04 | 5、6、10 |
| FR-09、受入条件 4・5 | 6、11 |
| FR-11 | 1〜4 |
| 受入条件 1〜3 | 9、10、11 |
| 受入条件 6 | 9、10 |
| FE テスト（Q5=B） | 12、15、17 |

## Completion Criteria
- すべてのステップが `[x]` になっている。
- `./gradlew test`（全件）、`./gradlew checkstyleMain`、`pnpm test`、`pnpm lint`、`pnpm format:check` が通っている。実行できなかったものは、そのとおり要約に記載する。
- PostgreSQL での `LIKE ... ESCAPE` の動作は、ローカルの PostgreSQL に接続できたときだけ実機で確認する。接続できない場合は「未確認」と記載する。
