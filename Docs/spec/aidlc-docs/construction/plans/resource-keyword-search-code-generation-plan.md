# Code Generation Plan — `resource-keyword-search`

> **このプランは Code Generation の唯一の真実の源である。** Part 2 の生成では、ここに書かれた手順のみを、この順序で実行する。プランに無い変更は行わない。

## ユニット文脈

- **ユニット名**: `resource-keyword-search`（単一・縦切り）
- **ワークスペースルート**: `/workspace`（Brownfield。既存ファイルはその場で変更し、複製は作らない）
- **担当ストーリー**: ST-01〜ST-11（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **設計**: `Docs/spec/aidlc-docs/construction/resource-keyword-search/functional-design/`
- **他ユニットへの依存**: なし
- **このユニットが所有するエンティティ**: `Resource`（変更なし。スキーマ変更・マイグレーション追加なし）
- **提供する契約**: `GET /api/resources` の任意クエリパラメータ `keyword`（後方互換）

### サービス境界

| 層 | 責務 |
|---|---|
| domain | 絞り込み述語の組み立てとキーワードの正規化 |
| application | 述語の合成と2経路への適用、占有判定、ページネーション |
| presentation | パラメータの受け取りと入力検証 |
| frontend | キーワードの入力・URL への往復・Server Action への受け渡し |

---

## 実行ステップ

### Step 1: リポジトリ層の生成 — 述語ユーティリティの新設

- [x] `backend/src/main/java/com/example/bookflow/domain/ResourceSpecifications.java` を**新規作成**する
- [x] 公開する静的メソッド：
  - `normalizeKeyword(String raw)` — `null` / 空文字 / 空白のみ を `null` に、それ以外を `strip()` 済み文字列に正規化する（BR-05）。`String.isBlank()` と `String.strip()` を用いる（全角空白を含む Unicode 空白に対応するため `trim()` は使わない）
  - `activeOnly(boolean isAdmin)` — 非 ADMIN のとき `isActive = true`、ADMIN のとき `Specification.unrestricted()`（BR-09）
  - `categoryEquals(ResourceCategory category)` — `null` のとき `Specification.unrestricted()`
  - `keywordMatches(String keyword)` — 正規化後が `null` のとき `Specification.unrestricted()`。それ以外は `LOWER(name) LIKE :pattern ESCAPE '\'` **OR** `LOWER(description) LIKE :pattern ESCAPE '\'`（BR-01〜BR-04、BR-06）
  - `listFilter(ResourceCategory category, String keyword, boolean isAdmin)` — 上記3つを AND で合成して返す（BR-07）
- [x] エスケープ処理：`\` → `\\`、`%` → `\%`、`_` → `\_` の順に置換する（バックスラッシュを最初に処理する。順序を誤ると挿入した `\` が二重になる）
- [x] 小文字変換は `toLowerCase(Locale.ROOT)` を用いる（ロケール依存の変換を避ける）
- [x] `private ResourceSpecifications() {}` を定義する（インスタンス化を防ぐ。ユーティリティクラスの慣用）
- [x] Javadoc に BR 番号と設計文書への参照を記す
- **対応ストーリー**: ST-01、ST-02、ST-03

> **エスケープ文字が動かなかった場合の対処**：`cb.like(expr, pattern, '\\')` は PostgreSQL と H2 の PostgreSQL 互換モードの双方で解釈される想定である。Step 6 のテストが「結果が違う」ではなく SQL やドライバ層のエラーで落ちた場合は、エスケープを外すのではなくエスケープ文字を `'!'` に変更する。バックスラッシュは方言とドライバの組み合わせによって二重の引用符解釈を受けることがあるが、`!` にはその性質がない。

### Step 2: リポジトリ層の生成 — `ResourceRepository` の変更

- [x] `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` を**変更**する
- [x] `JpaSpecificationExecutor<Resource>` を継承に追加する
- [x] 既存の派生クエリメソッド6個を**削除**する：`findByIsActiveTrue(Pageable)`・`findByIsActiveTrue()`・`findByCategoryAndIsActiveTrue(ResourceCategory, Pageable)`・`findByCategoryAndIsActiveTrue(ResourceCategory)`・`findByCategory(ResourceCategory, Pageable)`・`findByCategory(ResourceCategory)`
  - 削除の根拠：参照箇所を調査した結果、`ResourceService` と `ResourceServiceTest` 以外から使われていない。述語合成に置き換えた後は未使用になる
- [x] 悲観ロック用の `findByIdForUpdate` は**残す**（予約サービスが使用する）
- [x] クラス Javadoc の説明を、派生クエリ前提の記述から Specification 前提の記述に書き換える
- **対応ストーリー**: ST-01、ST-04

### Step 3: 業務ロジックの生成 — `ResourceService` の変更

- [x] `backend/src/main/java/com/example/bookflow/application/ResourceService.java` を**変更**する
- [x] `list` のシグネチャに `String keyword` を追加する（`category` の直後に置く）
- [x] `list` の冒頭で `ResourceSpecifications.listFilter(category, keyword, isAdmin)` を**1回だけ**呼び、`from`/`to` の分岐より前に述語を確定させる（BR-08）
- [x] `listPaginated` を、述語を引数に取り `resourceRepository.findAll(spec, pageable)` を呼ぶ形に置き換える。既存の「ADMIN か否か × カテゴリの有無」4分岐を削除する
- [x] `fetchAllCandidates` を、述語を引数に取り `resourceRepository.findAll(spec)` を呼ぶ形に置き換える。同様に4分岐を削除する
- [x] `listWithAvailabilityFilter` の占有判定・手動ページネーションのロジックは**変更しない**
- [x] 評価順序は現行どおり「述語で絞る → 占有判定 → ページネーション」を維持する
- [x] Javadoc の `@param` に `keyword` を追加し、2経路の説明を更新する
- **対応ストーリー**: ST-01、ST-04、ST-09、ST-10、ST-11

### Step 4: 業務ロジックの単体テスト — `ResourceServiceTest` の変更

- [x] `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` を**変更**する
- [x] `List_` ネストクラスの既存4テストを、`list(...)` の新シグネチャに合わせて呼び出しを修正する（`keyword` に `null` を渡す）
- [x] 既存のリポジトリスタブを書き換える：
  - `findByIsActiveTrue(pageable)` / `findAll(pageable)` → `findAll(any(Specification.class), eq(pageable))`
  - `findByIsActiveTrue()` → `findAll(any(Specification.class))`
  - 書き換えの理由：Mockito の strict stubs 下では、呼ばれなくなったスタブが `UnnecessaryStubbingException` を引き起こす
- [x] テストを追加する：
  - `list_withKeyword_delegatesSpecificationToRepository` — キーワード指定時に `findAll(Specification, Pageable)` が呼ばれる
  - `list_withKeywordAndTimeFilter_delegatesSpecificationToRepository` — 期間指定時も `findAll(Specification)` が呼ばれる（両経路への適用の担保・AC-04-4）
- **対応ストーリー**: ST-04（両経路）

> **既存2テストの性質が変わることを記録する**：`list_memberWithoutFilter_returnsActiveOnly` と `list_adminWithoutFilter_returnsAllIncludingInactive` は、書き換え後どちらも `findAll(any(Specification.class), eq(pageable))` をスタブすることになる。ADMIN と非 ADMIN の違いは述語の中身に移るため、モック境界からは観測できなくなり、両テストは振る舞いの検証ではなく委譲の検証に変わる。ロール別の可視範囲そのものは `ResourceControllerTest` の同名テスト2件が実 DB に対して検証しているため、リポジトリ全体としての被覆は失われない。この性質の変化はレビュー時に発見されるのではなく、あらかじめ記録された決定として扱う。テストクラスの当該箇所にもコメントとして残す。

### Step 4b: 述語ユーティリティの単体テスト — `ResourceSpecificationsTest` の新設

- [x] `backend/src/test/java/com/example/bookflow/domain/ResourceSpecificationsTest.java` を**新規作成**する
- [x] `normalizeKeyword` のテストを書く：`null` / 空文字 / 半角空白のみ / 全角空白のみ / 前後に空白を含む文字列 / 内部に空白を含む文字列
- [x] `ResourceServiceTest` のネストクラスにはしない。純粋関数のテストであり、`@ExtendWith(MockitoExtension.class)` の strict stubs 配下に置く理由がない。本リポジトリの慣行も本番クラス1つにテストクラス1つである
- [x] Mockito のモックでは述語の中身を検証できないため、正規化規則はこの純粋関数のテストで担保し、SQL としての挙動は Step 6 の結合テストで担保する
- **対応ストーリー**: ST-05（正規化）

### Step 5: API 層の生成 — `ResourceController` の変更

- [x] `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` を**変更**する
- [x] `list` に `@RequestParam(required = false) String keyword` を追加する
- [x] 既存の `from`/`to` 同時指定チェックの直後に、キーワード長の検証を追加する（BR-10）：
  - `ResourceSpecifications.normalizeKeyword(keyword)` の結果が 100 文字を超える場合、`ValidationException` を投げる
  - メッセージ：「キーワードは 100 文字以内で入力してください。」
  - 既存の `ValidationException` は `400 Bad Request`（`code: VALIDATION_ERROR`）に変換される
- [x] `resourceService.list(...)` の呼び出しに `keyword` を渡す
- [x] Javadoc に `@param keyword` を追加し、クラス Javadoc の一覧説明を更新する
- **対応ストーリー**: ST-01、ST-11

### Step 6: API 層の結合テスト — `ResourceControllerTest` の変更

- [x] `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` を**変更**する
- [x] シード用リソースを3件追加する（`@BeforeEach` の挿入と `@AfterEach` の削除を対で行う）：
  - `KEYWORD_RESOURCE_ID` — 名称「大会議室」、説明「Projector 完備」、`ROOM`、active
  - `WILDCARD_RESOURCE_ID` — 名称「50%OFF備品_旧型」、説明 NULL、`EQUIPMENT`、active
  - `NO_DESC_RESOURCE_ID` — 名称「車両サンプル」、説明 NULL、`VEHICLE`、active
- [x] テストを追加する（いずれも実 DB の H2 に対して実行され、生成 SQL の妥当性を検証する）：

  | テスト名 | 検証内容 | AC |
  |---|---|---|
  | `list_withKeywordMatchingName_returnsMatchingResourcesOnly` | 名称への部分一致で絞り込まれる | AC-01-1 |
  | `list_withKeywordMatchingDescriptionOnly_returnsResource` | 説明文のみへの一致でも返る | AC-01-2 |
  | `list_withKeywordAndNullDescription_returnsResourceMatchedByName` | `description` が NULL でも名称一致なら返る | AC-01-3 |
  | `list_withKeywordMatchingNothing_returnsEmptyContent` | 一致なしで0件 | AC-01-4 |
  | `list_withLowercaseKeyword_matchesUppercaseName` | `projector` で `Projector` に一致 | AC-02-1 |
  | `list_withUppercaseKeyword_matchesSameResource` | `PROJECTOR` でも同じ結果 | AC-02-2 |
  | `list_withPercentInKeyword_doesNotMatchAsWildcard` | キーワード `会議%室` で `大会議室`・`第1会議室` のいずれも返らない | AC-03-1 |
  | `list_withPercentInKeyword_matchesLiteralPercent` | キーワード `50%OFF` で該当リソースが返る（正方向） | AC-03-1 |
  | `list_withUnderscoreInKeyword_doesNotMatchAsWildcard` | キーワード `第_会議室` で `第1会議室` が返らない | AC-03-2 |
  | `list_withKeywordAndCategory_appliesBothFilters` | キーワード AND カテゴリ | AC-04-1 |
  | `list_withKeywordAndTimeRange_appliesBothFilters` | キーワード AND 期間（占有リソースの除外） | AC-04-2 |
  | `list_withKeywordCategoryAndTimeRange_appliesAllFilters` | キーワード AND カテゴリ AND 期間の3条件 | AC-04-3 |
  | `list_withBlankKeyword_behavesAsUnspecified` | 空白のみは未指定と同じ | AC-05-3 |
  | `list_withKeywordExceeding100Chars_returns400ValidationError` | 101 文字で 400 | BR-10 |
  | `list_adminWithKeywordMatchingInactive_includesInactiveResource` | ADMIN は無効リソースも返る | AC-09-1 |
  | `list_memberWithKeywordMatchingInactive_excludesInactiveResource` | MEMBER は返らない | AC-10-1 |
  | `list_approverWithKeywordMatchingInactive_excludesInactiveResource` | APPROVER も返らない | AC-10-2 |

- [x] 既存の一覧テスト6件は**変更しない**（アサーションが件数ではなく ID フィルタのため、シード追加の影響を受けない）
- **対応ストーリー**: ST-01、ST-02、ST-03、ST-04、ST-05、ST-09、ST-10、ST-11

> **ワイルドカードのテストは「壊れたときに落ちる」形にする**：素朴に「キーワード `50%` で `50%OFF備品_旧型` が返る」とだけ書くと、エスケープが壊れてパターンが `%50%%` になった場合でも、名称に `50` を含むリソースが他に無いため同じ結果になり、テストが通ってしまう。そこでエスケープが壊れたときに**より多く**一致する入力を選ぶ。`会議%室` は、エスケープが効いていれば0件、効いていなければ `%会議%室%` として `大会議室` と `第1会議室` の両方に一致する。`第_会議室` も同様に、エスケープが効いていなければ `第1会議室` に一致する。
>
> この2件はエスケープの**順序**の誤りも捕捉する。`%` を `\` より先に置換すると、入力 `会議%室` は `会議\\%室` となり、`\\` がリテラルのバックスラッシュとして解釈されて `%` がワイルドカードのまま残るため、テストが落ちる。したがってバックスラッシュ自体を含む専用のシードデータは必須ではない。

### Step 7: フロントエンドの生成 — Server Action

- [x] `frontend/src/server/actions/resources.ts` を**変更**する
- [x] `ListResourcesParams` に `keyword?: string` を追加する
- [x] クエリ組み立てに `if (params?.keyword) queryParams.keyword = params.keyword;` を追加する（既存の「値があれば積む」形に揃える）
- [x] `listResourcesAction` の JSDoc にキーワード検索の説明を追記する
- **対応ストーリー**: ST-01

### Step 8: フロントエンドの生成 — 一覧画面

- [x] `frontend/src/app/(authenticated)/resources/page.tsx` を**変更**する
- [x] `SearchParams` インターフェースに `keyword?: string` を追加する
- [x] `listResourcesAction` の引数に `keyword: params.keyword` を追加する
- [x] `ResourceFilterForm` に `defaultKeyword={params.keyword}` を渡す
- [x] `PaginationNav` は**変更しない**（`query={params}` で `keyword` が自動的に引き継がれる）
- **対応ストーリー**: ST-07、ST-08

### Step 9: フロントエンドの生成 — フィルタフォーム

- [x] `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` を**変更**する
- [x] `ResourceFilterFormProps` に `defaultKeyword?: string` を追加する
- [x] キーワード入力欄を**カテゴリより前**（フォームの先頭）に追加する：
  - `Label htmlFor="keyword"`、ラベル文言「キーワード」
  - `Input id="keyword" name="keyword" type="text" maxLength={100}`
  - `placeholder="リソース名・説明で検索"`
  - `defaultValue={defaultKeyword}`
  - `data-testid="resource-filter-keyword-input"`（自動化容易性のため。既存コードに `data-testid` の使用例は無いが、将来の E2E テスト追加課題を見越して新規要素にのみ付与する）
- [x] グリッドのクラスを `sm:grid-cols-3` から `sm:grid-cols-2 lg:grid-cols-4` に変更する（4項目が狭い画面で潰れないようにする）
- [x] URL 組み立てのロジックを、純関数 `buildResourceFilterHref(values: { category?, from?, to?, keyword? }): string` として**切り出して export** する。`handleSubmit` は `FormData` から値を取り出してこの関数に渡すだけにする
  - 切り出す理由：本リポジトリのフロントエンドには、クライアントコンポーネントを描画して検証するテストが存在しない。既存の `pagination-nav.test.ts` は同じ理由で URL 生成ロジック（`buildHref`）を純関数として切り出して検証している。その慣行に合わせることで、描画テストの仕組みを新たに持ち込まずに AC-05-1 を検証できる
- [x] `buildResourceFilterHref` の規則：値が空文字・`undefined` のキーは付与しない。`category` が `"ALL"` のときも付与しない（既存の挙動を踏襲）
- [x] `handleReset` は**変更しない**（`/resources` へ遷移するため全条件が解除される）
- [x] コンポーネント JSDoc にキーワード検索の記述を追加する
- **対応ストーリー**: ST-01、ST-05、ST-06、ST-08

### Step 10: フロントエンドの単体テスト

- [x] `frontend/tests/unit/server/actions/resources.test.ts` を**変更**する
- [x] テストを追加する：
  - `keyword パラメータをクエリに載せて送信する` — MSW ハンドラでリクエスト URL を捕捉し `keyword` が付くことを検証する
  - `keyword が未指定のときはクエリに載せない` — `keyword` が URL に現れないことを検証する
- [x] 既存テストは**変更しない**
- **対応ストーリー**: ST-01、ST-05

### Step 10b: フロントエンドの単体テスト — URL 組み立てとページ送り

- [x] `frontend/tests/unit/resource-filter-href.test.ts` を**新規作成**する
- [x] `buildResourceFilterHref` のテストを書く：
  - キーワードを指定すると `?keyword=...` が付く（AC-01-1 の入力側）
  - キーワードが空文字なら `keyword` が付かない（**AC-05-1**）
  - キーワードとカテゴリと期間を同時に指定すると3つとも付く（AC-04-1 の入力側）
  - すべて空なら `/resources` になる（AC-06-1 相当）
- [x] `frontend/tests/unit/pagination-nav.test.ts` に、`keyword` を含むクエリがページ送りで引き継がれることを確認するケースを1件追加する（**AC-07-1**）
- [x] これにより `stories.md` が FE 検証と記した受入基準（AC-05-1、AC-06-1、AC-07-1）が、計画の生成物と一致する
- **対応ストーリー**: ST-05、ST-06、ST-07

### Step 11: 生成サマリの作成

- [x] `Docs/spec/aidlc-docs/construction/resource-keyword-search/code/generation-summary.md` を**新規作成**する
- [x] 内容：変更ファイルと新規ファイルの一覧（変更種別つき）、ストーリーと実装の対応、既知の非目標
- [x] 重複ファイル（`ClassName_modified.java` 等）が生成されていないことを確認する

### Step 12: 状態更新

- [x] 本プランのチェックボックスをすべて `[x]` にする
- [x] `Docs/spec/aidlc-state.md` の Code Generation を完了にする
- [x] `Docs/spec/aidlc-audit.md` に記録する

---

## 本ステージで実行しないもの

| 項目 | 理由 |
|---|---|
| DB マイグレーションの追加 | スキーマ変更がない |
| デプロイ成果物の生成 | 本リポジトリに IaC が無く、デプロイは DevContainer と CI に閉じる |
| 仕様書の更新 | Spec Update ステージで実施済み |
| テストの実行 | Build and Test ステージで実施する |
| `ResourceManagementClient.tsx` の変更 | ユニットの範囲外 |
| `src/lib/types/api.ts` の変更 | 応答の形が変わらない |

## 変更対象ファイル一覧

**新規作成（4）**

| パス | 種別 |
|---|---|
| `backend/src/main/java/com/example/bookflow/domain/ResourceSpecifications.java` | アプリケーションコード |
| `backend/src/test/java/com/example/bookflow/domain/ResourceSpecificationsTest.java` | テスト |
| `frontend/tests/unit/resource-filter-href.test.ts` | テスト |
| `Docs/spec/aidlc-docs/construction/resource-keyword-search/code/generation-summary.md` | ドキュメント |

**変更（10）**

| パス | 層 |
|---|---|
| `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` | domain |
| `backend/src/main/java/com/example/bookflow/application/ResourceService.java` | application |
| `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` | presentation |
| `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` | テスト |
| `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` | テスト |
| `frontend/src/server/actions/resources.ts` | frontend BFF |
| `frontend/src/app/(authenticated)/resources/page.tsx` | frontend 画面 |
| `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` | frontend コンポーネント |
| `frontend/tests/unit/server/actions/resources.test.ts` | テスト |
| `frontend/tests/unit/pagination-nav.test.ts` | テスト |

> `ResourceService.list` の呼び出し元を調査した結果、`ResourceController` のみであることを確認した。`ReservationService` と `ApprovalService` は `ResourceService.overlaps`（本変更の対象外の静的メソッド）を参照しているだけである。したがって上記の一覧が変更対象の全体である。

## ストーリーの実装対応

- [x] ST-01 キーワードで一覧を絞り込む — Step 1、2、3、5、7、8、9
- [x] ST-02 大文字小文字を意識せずに検索する — Step 1、6
- [x] ST-03 記号を含む語句をそのまま検索する — Step 1、6
- [x] ST-04 キーワードとカテゴリ・期間を組み合わせる — Step 1、3、4、6
- [x] ST-05 キーワード条件だけを解除する — Step 1、4b、6、9、10、10b
- [x] ST-06 すべてのフィルタを一度に解除する — Step 9（既存 `handleReset` で充足）、10b
- [x] ST-07 キーワードを保ったままページを送る — Step 8（既存 `PaginationNav` で充足）、10b
- [x] ST-08 入力したキーワードが画面に残る — Step 8、9
- [x] ST-09 管理者が無効リソースを検索で見つける — Step 1、6
- [x] ST-10 一般社員の検索結果に無効リソースが現れない — Step 1、6
- [x] ST-11 既存のフィルタ操作が変わらない — Step 3、5、6
