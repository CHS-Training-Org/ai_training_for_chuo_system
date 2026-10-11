# Code Generation Plan: resource-list-filter（Issue #23）

この計画は Code Generation の唯一の正である。Part 2 は本計画の番号順に実行し、完了した手順はその場でチェックボックスを `[x]` にする。計画にない変更はしない。

## ユニットの文脈

- **ユニット**: `resource-list-filter`（単一。Units Generation はスキップ済み）
- **種別**: Brownfield（既存ファイルを直接変更する。`*_modified` のような複製は作らない）
- **ワークスペースルート**: `/workspace`。アプリケーションコードは `backend/` と `frontend/` に置き、`Docs/spec/aidlc-docs/` には置かない
- **ストーリー対応**: User Stories はスキップ済みのため、要件 RES-01〜04 と受入条件 6 項目（下記）に対応づける
- **入力**: `application-design/` 配下 5 ファイル、`requirements.md`、更新済みの `api-spec.md` §`GET /api/resources` と `screen-spec.md` §`/resources`
- **依存**: FE は BE の API 契約（`keyword` 任意クエリ）に依存するため、BE を先に完成させる。DB スキーマ・Flyway・`build.gradle.kts` は変更しない
- **対象外**: ソート順選択、from/to 経路のメモリ処理の改善、OpenAPI クライアント自動生成、`requirements.md` の変更、`keyword` の長さ上限

## 設計との差分（承認時に確認してほしい点）

1. **Repository 層テストの方式**: Application Design は「`@DataJpaTest` を新設する」としていたが、本計画は依存を追加せず、既存の `ResourceControllerTest` と同じ `@SpringBootTest` + `@ActiveProfiles("test")` + `@Transactional`（H2、`MODE=PostgreSQL`）で Repository を直接検証する。検証内容は設計の申し送りと同じで、変わるのは起動方式だけである。方針の内訳は次のとおり（`@SpringBootTest` + `@Transactional` で進めることは、あなたの指示で決定済み）。
   - **`@DataJpaTest` を使わない理由**: Spring Boot 4.0 では `@DataJpaTest` が別モジュール（`spring-boot-data-jpa-test`）に分離され、現行の `build.gradle.kts` のテスト依存には含まれない（`spring-boot-starter-test:4.0.6` の POM、`spring-boot-test-autoconfigure-4.0.6.jar` の中身、キャッシュ内の全 jar で確認済み）。依存を足せば使える（BOM が `spring-boot-starter-data-jpa-test` のバージョンを管理している）が、取得にネットワークが必要で、`@DataJpaTest` は既定で DB を組み込み H2 に差し替えるため `MODE=PostgreSQL` を保つ追加設定も要る。依存を足さず既存のテストと同じ土台で同じ検証ができるため、「依存を追加しない」を選んだ。使えないからではなく、足す必要がないからである。
   - **H2 での事前確認**: H2 2.4.240、`MODE=PostgreSQL` で、`description`（TEXT）が `CHARACTER VARYING` になり、`lower()` と `LIKE ... ESCAPE '\'`、`%` `_` `\` のリテラル扱い、NULL 行の扱いが期待どおりに動くことを、生の JDBC で確認済み。Hibernate（Criteria の `like` とエスケープ文字）を通した動作は、Step 8 で初めて確認する。
   - **本番との差**: 本番の PostgreSQL では実測していない。`lower()` と `LIKE ... ESCAPE` は標準的な機能のため、本計画では追加の検証を置かない。
   - **この方針で既存の設計ファイルとずれる箇所**: `application-design/application-design.md` の「テスト」欄に `@DataJpaTest` の記述が残る。承認済みの成果物のため、本計画では変更せず、差分として本節に記録する。
2. **ユーティリティクラスの規約**: `checkstyle.xml` に `FinalClass` / `HideUtilityClassConstructor` は含まれない。`ResourceSpecifications` には private コンストラクタを付ける（設計の `public final class` と矛盾しない）。
3. **FE の画面レイアウト**: 設計・spec はフォームの配置を規定していない。キーワード入力欄は、既存の 3 列グリッドの上に全幅の 1 行として置く。

## 実装手順

### A. Backend（Repository → Service → Controller の順。FE が依存する API 契約を先に確定する）

- [x] **Step 1: 影響範囲の確認（読み取りのみ）**
  - `ResourceRepository` の削除対象 6 メソッド（`findByIsActiveTrue` / `findByCategoryAndIsActiveTrue` / `findByCategory` の Page・List 版）と、継承の `findAll()` / `findAll(Pageable)` の呼び出し元を `grep` で洗い出す
  - 既知の呼び出し元は `ResourceService`（`listPaginated`、`fetchAllCandidates`）と `ResourceServiceTest` のみ。想定外の呼び出し元があれば、実装に入る前に報告して計画を修正する
  - `ResourceService.list` の呼び出し元は `ResourceController` のみであることを確認する

- [x] **Step 2: `ResourceSpecifications` を新規作成**（Business Logic）
  - ファイル: `backend/src/main/java/com/example/bookflow/domain/ResourceSpecifications.java`
  - `public final class`、private コンストラクタ、日本語 Javadoc（既存の記述密度に合わせる）
  - `public static Specification<Resource> isActiveTrue()`: `isActive` 属性が true
  - `public static Specification<Resource> hasCategory(ResourceCategory category)`: `category` 属性の等価
  - `public static Specification<Resource> keywordContains(String keyword)`: `lower(name) LIKE :p ESCAPE '\'` と `lower(description) LIKE :p ESCAPE '\'` を OR で結合。`description` が NULL の行は `name` だけで判定される
  - `static String escapeLike(String keyword)`（package-private、テスト用に公開）: 先に `\`、次に `%`、`_` の順にエスケープ。パターンは `"%" + escape(keyword.toLowerCase(Locale.ROOT)) + "%"` をバインドパラメータで渡す。文字列連結でクエリを組まない
  - 属性名は `name` / `description` / `category` / `isActive`（`Resource` はフィールドアクセスで、既存の派生クエリ `findByIsActiveTrue` と同じ名前）

- [x] **Step 3: `ResourceSpecificationsTest` を新規作成**（Business Logic Unit Testing）
  - ファイル: `backend/src/test/java/com/example/bookflow/domain/ResourceSpecificationsTest.java`（Mockito 不要の純粋な単体テスト）
  - `escapeLike` を検証: 通常文字はそのまま／`%`・`_`・`\` がそれぞれ `\%`・`\_`・`\\` になる／`\` を先に処理するため二重エスケープにならない（例：`50%_\` の変換結果）／大文字小文字は変換しない（小文字化は呼び出し側）
  - 命名規約（ADR-018）: `methodName_condition_expectedBehavior`

- [x] **Step 4: `ResourceRepository` を変更**（Repository Layer）
  - ファイル: `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java`
  - `JpaSpecificationExecutor<Resource>` を継承に追加
  - 一覧用の派生クエリ 6 本と、その見出しコメント（「非 ADMIN 用」「ADMIN 用」）を削除。`findByIdForUpdate` は変更しない
  - クラス Javadoc の「ページネーション有り / 無し」「from/to フィルタ」に関する記述を、Specification 方式に合わせて書き換える
  - 未使用になる import（`List`、`Page`、`Pageable`）を削除する（Spotless の `removeUnusedImports`、Checkstyle の `UnusedImports` に合わせる）
  - この時点では `ResourceService` がコンパイルできない。Step 5 と連続して実施し、コンパイル確認は Step 5 の後に行う

- [x] **Step 5: `ResourceService` を変更**（Business Logic）
  - ファイル: `backend/src/main/java/com/example/bookflow/application/ResourceService.java`
  - `list(category, keyword, from, to, isAdmin, pageable)` に引数 `keyword` を追加（`category` の次）
  - `normalizeKeyword(String)`（private static）: trim。null・空・空白のみは null
  - `buildSpec(category, keyword, isAdmin)`（private）: 条件のリストを組み立て、`Specification.allOf(conditions)` で結合する。非 ADMIN のときだけ `isActiveTrue()`、`category` があれば `hasCategory`、正規化後 `keyword` があれば `keywordContains`。戻り値は常に非 null（`null` を渡さない、`where(null)` を使わない）
  - 通常経路: `resourceRepository.findAll(spec, pageable).map(ResourceResponse::from)`
  - 空き確認経路: `fetchAllCandidates` を `resourceRepository.findAll(spec)` に置き換え、占有除外と手動ページネーションは既存ロジックを維持
  - `listPaginated` / `listWithAvailabilityFilter` / `fetchAllCandidates` の引数を `spec` に合わせて整理する（`category` と `isAdmin` を渡す代わりに `spec` を渡す）
  - `list` の Javadoc に `@param keyword` を追加し、クラス Javadoc の記述を実態に合わせる
  - ソート順は変更しない（指定なしのまま）

- [x] **Step 6: `ResourceController` を変更**（API Layer）
  - ファイル: `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`
  - `list` に `@RequestParam(required = false) String keyword` を追加（`category` の次）。正規化はせず、そのまま `resourceService.list(category, keyword, from, to, isAdmin, pageable)` に渡す
  - Javadoc に `@param keyword` を追加。`from` / `to` の片方のみ指定時の 400 の既存チェックは変更しない

- [x] **Step 7: `ResourceServiceTest` を更新**（Business Logic Unit Testing）
  - ファイル: `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`
  - 既存の `List_` の 4 テスト（`list_memberWithoutFilter_returnsActiveOnly`、`list_adminWithoutFilter_returnsAllIncludingInactive`、`list_memberWithTimeFilterAndOccupied_excludesOccupiedResource`、`list_memberWithTimeFilterAndAdjacentReservation_includesResource`）は、アサーションを変更しない
  - 許容する変更は 2 点だけ: (1) `list(...)` の呼び出しに `keyword` 引数（`null`）を追加、(2) スタブ対象を `findAll(any(Specification.class), eq(pageable))`（Page 版）と `findAll(any(Specification.class))`（List 版）に置き換える。`any(Specification.class)` は型を明示し、`findAll(PredicateSpecification)` との曖昧さを避ける
  - 新規テスト（`List_` に追加）: `keyword` 指定でも通常経路は `findAll(spec, pageable)` を呼ぶ／`keyword` と `from`/`to` の併用で、候補（`findAll(spec)`）から占有リソースが除外される
  - `Specification` は不透明なため、Service のモックテストでは可視性や `keyword` の中身は検証しない（設計どおり。Step 8 と Step 9 で担保する）

- [x] **Step 8: `ResourceRepositoryTest` を新規作成**（Repository Layer Unit Testing）
  - ファイル: `backend/src/test/java/com/example/bookflow/domain/ResourceRepositoryTest.java`
  - 起動方式: `@SpringBootTest` + `@ActiveProfiles("test")` + `@Transactional`（テストごとにロールバック）。`ResourceRepository` を `@Autowired` し、`Resource.create(...)` と `save` で投入する
  - **共有 DB を前提にした検証方針**: テスト用 H2 は `jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1` で、同じ JVM のほかのテストクラスと共有される。`ResourceControllerTest.create_adminWithValidRequest...` が API 経由で登録した「新会議室」は後始末されず残るため、絶対件数の検証は不安定になる。次の方針で書く。
    - 件数の完全一致（`hasSize(N)`、`totalElements == N`）を使わない。自分が投入した行の ID を基準に、`contains` / `containsExactlyInAnyOrder` / `doesNotContain` で検証する
    - 検索語は一意なトークン（例：名称・説明に `ZZ-FILTER-` を含める）にして、他のテストの残存データに一致しないようにする。`keyword` 条件を使う検証は、このトークンで絞った結果に対して行う
    - 「条件なし」「ADMIN の全件」の検証は、自分が投入した全行が結果に含まれることで確認する（ほかの行が含まれていてもよい）
    - ページングの検証は、一意なトークンで絞ってから `Pageable` を適用し、`totalElements` と `content` を自分の投入行の数で確認する（トークンで絞った母集団は自分の投入行だけになる）
  - 検証項目（`Specification.allOf` で組み立てた条件を `findAll` に渡す）:
    - 部分一致: `name` に一致／`description` に一致／どちらにも一致しない
    - 大文字小文字を区別しない（大文字・小文字・混在）
    - `description` が NULL の行は `name` だけで判定され、例外にならない
    - **H2 の TEXT 列（`description`）に対する `lower()` と `LIKE ... ESCAPE` の動作**（生の JDBC では確認済み。ここでは Hibernate を通した動作を初めて確認する。期待どおり動かない場合は、実装を進める前に報告して方針を相談する）
    - `%`・`_`・`\` がリテラルとして扱われる（例：`100%` が「1000」に一致しない、`_` が任意 1 文字にならない）
    - 非 ADMIN の active 限定（`isActiveTrue()` で inactive が除外される）
    - ADMIN の全件（条件なしの `Specification.unrestricted()` で、自分が投入した inactive の行を含めて全行が返る。件数は検証せず、ID の包含で確認する）
    - カテゴリと `keyword` の AND
    - Page 版（`findAll(spec, pageable)`）で、ページングと `totalElements` が条件適用後の件数になる（一意なトークンで絞った母集団に対して確認する）

- [x] **Step 9: `ResourceControllerTest` に `keyword` のテストを追加**（API Layer Unit Testing）
  - ファイル: `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`（実 DB の MockMvc。既存テストは変更しない）
  - 既存のシード（`第1会議室` ROOM・active、`旧備品A` EQUIPMENT・inactive、いずれも `description` は NULL）を使い、必要なら `description` 付きのシードをテスト内で追加して、後始末も追加する（追加したシードは `@AfterEach` で削除する）
  - **共有 DB を前提にした検証方針**: Step 8 と同じ理由で、絶対件数を検証しない。
    - レスポンスの `content` に自分の投入行（または固定 ID のシード）が含まれる・含まれないことを `jsonPath` の ID（`$.content[*].id`）で検証する。`$.totalElements` を固定値と比べない
    - 検索語には一意なトークン（例：`ZZ-FILTER-`）を含むシードを使い、ほかのテストの残存データに一致しないようにする
    - 「空白のみは全件」は、`keyword` なしのレスポンスの `$.content[*].id` と一致することで確認する（固定件数と比べない）
    - 「`keyword` なしと同じ結果」は、2 つのリクエストの `totalElements` と `content` の ID 一覧が一致することで確認する
  - 検証項目: `keyword` で `name` 一致／大文字小文字／空白のみは全件（`keyword` なしと同じ）／前後の空白の trim／`%` がリテラル／ADMIN は inactive も `keyword` で絞り込める・MEMBER は inactive に一致しない／`category` との AND／`from`・`to` との AND（占有除外と併用）
  - ロール別可視性と from/to 除外は、既存テストが引き続き実 DB で担保する

- [x] **Step 10: Backend のチェックポイント**
  - `cd backend && ./gradlew spotlessApply`、`./gradlew checkstyleMain`、`./gradlew test`
  - 失敗した場合は原因を調べて修正し、結果を報告する。テストを弱めて通すことはしない（アサーションの削除、期待値の緩和をしない）
  - Spotless が整形した差分は、意図した変更だけかを確認する

### B. Frontend（Server Action → page → ResourceFilterForm → テストの順）

- [x] **Step 11: `listResourcesAction` を変更**（Server Action）
  - ファイル: `frontend/src/server/actions/resources.ts`
  - `ListResourcesParams` に `keyword?: string` を追加し、値が真のときだけ `queryParams.keyword` に設定する（空文字は付与しない）

- [x] **Step 12: `page.tsx` を変更**（Frontend Components）
  - ファイル: `frontend/src/app/(authenticated)/resources/page.tsx`
  - `SearchParams` に `keyword?: string` を追加し、`listResourcesAction` と `ResourceFilterForm`（`defaultKeyword`）に渡す
  - `PaginationNav` の `query` は `params` をそのまま渡しているため、ページ送りで `keyword` が保持される（変更不要）。この点を Part 2 で確認する
  - 空のときの文言（「リソースがありません。」）は変更しない

- [x] **Step 13: `ResourceFilterForm` を変更**（Frontend Components）
  - ファイル: `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`
  - props に `defaultKeyword?: string` を追加
  - ラベル「キーワード」、プレースホルダ「名称・説明で検索」、`id`/`name` は `keyword` の入力欄を、既存の 3 列グリッドの上に全幅の 1 行として追加（既存の `Label` / `Input` の様式に合わせる）
  - `handleSubmit` で `keyword` を trim し、非空のときだけ `params.set("keyword", keyword)`。`page` は付与しない（送信時は先頭ページから表示する既存挙動を踏襲）
  - 見出し「フィルタ・空き確認」、「リセット」の挙動（`router.push("/resources")`）は変更しない

- [x] **Step 14: Frontend のテストを追加**（Frontend Components Unit Testing）
  - `frontend/tests/unit/server/actions/resources.test.ts`: `keyword` 指定時に API へ `keyword` が付与される／未指定・空文字では付与されない。MSW の `server.use` で `http.get("/api/backend/resources", ...)` を差し替え、`request.url` の `searchParams` を検証する（既存テストの様式）
  - `frontend/tests/unit/resources/resource-filter-form.test.tsx`（新規）: `@testing-library/react` と `user-event`（導入済み）でフォームを描画し、`next/navigation` の `useRouter` をモックする。検証項目は、キーワード入力して「絞り込む」で `router.push` が `keyword` 付きの URL で呼ばれる／空白のみ・空では `keyword` が付かない／前後の空白が除かれる／`page` が付かない／「リセット」で `/resources` へ遷移する／`defaultKeyword` が入力欄の初期値になる
  - リスク: 既存の `Select`（Radix）が jsdom で動かない場合、`tests/unit/setup.ts` への最小限の polyfill 追加が必要になる。必要になった場合は、追加前に理由を報告する

- [x] **Step 15: Frontend のチェックポイント**
  - `cd frontend && pnpm format`、`pnpm test`、`pnpm lint`、`pnpm format:check`
  - 失敗した場合は Step 10 と同じ方針で対処する

### C. 記録

- [x] **Step 16: 変更サマリの作成と進捗の更新**
  - `Docs/spec/aidlc-docs/construction/resource-list-filter/code/code-summary.md`（Markdown のみ）に、変更したファイル（Modified）と新規作成したファイル（Created）、テスト結果を記録する
  - 全手順のチェックボックスを `[x]` にし、`Docs/spec/aidlc-state.md` を更新する
  - 重複ファイル（`*_modified` など）が作られていないことを確認する
  - 完了メッセージは 2 択（Request Changes / Continue to Next Stage）で、承認を待つ

## 変更・作成ファイル一覧（予定）

| 区分 | ファイル | Step |
|---|---|---|
| Created | `backend/src/main/java/com/example/bookflow/domain/ResourceSpecifications.java` | 2 |
| Created | `backend/src/test/java/com/example/bookflow/domain/ResourceSpecificationsTest.java` | 3 |
| Modified | `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` | 4 |
| Modified | `backend/src/main/java/com/example/bookflow/application/ResourceService.java` | 5 |
| Modified | `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` | 6 |
| Modified | `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` | 7 |
| Created | `backend/src/test/java/com/example/bookflow/domain/ResourceRepositoryTest.java` | 8 |
| Modified | `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` | 9 |
| Modified | `frontend/src/server/actions/resources.ts` | 11 |
| Modified | `frontend/src/app/(authenticated)/resources/page.tsx` | 12 |
| Modified | `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` | 13 |
| Modified | `frontend/tests/unit/server/actions/resources.test.ts` | 14 |
| Created | `frontend/tests/unit/resources/resource-filter-form.test.tsx` | 14 |
| Created | `Docs/spec/aidlc-docs/construction/resource-list-filter/code/code-summary.md` | 16 |

変更しないもの: `build.gradle.kts`、Flyway、`requirements.md`、`api-spec.md` / `screen-spec.md`（Spec 更新で承認済み）、`.claude/` 配下。

## 受入条件との対応

| 受入条件 | 対応する手順 |
|---|---|
| `keyword` で絞ると `name` または `description` に含む結果のみ表示される | Step 2, 5, 8, 9, 13, 14 |
| 空にして「絞り込む」で条件が解除される | Step 5, 9, 13, 14 |
| カテゴリ・期間と `keyword` を同時指定でき AND になる | Step 5, 8, 9 |
| `keyword` 未指定時の動作は既存と変わらない | Step 5, 7, 9, 10 |
| 既存の BE テスト（`ResourceServiceTest` 等）が pass する | Step 7, 10（アサーション不変） |
| 追加した検索ロジックの BE ユニットテストを追加する | Step 3, 7, 8, 9 |

## 規模

全 16 手順（BE 10、FE 5、記録 1）。変更ファイルは 9 件、新規ファイルは 5 件。Part 2 の中間確認は、Step 10（BE）と Step 15（FE）の 2 か所に置く。
