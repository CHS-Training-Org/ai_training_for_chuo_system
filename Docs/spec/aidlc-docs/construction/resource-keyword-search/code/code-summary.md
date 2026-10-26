# Code Summary: resource-keyword-search

承認済みの計画（`Docs/spec/aidlc-docs/construction/plans/resource-keyword-search-code-generation-plan.md`）の実装結果。コミットと push は未実施。

## 変更したファイル（すべて既存ファイルの修正。新規のアプリケーションファイルなし）

### 仕様書
- `docs-next/docs/spec/api-spec.md`: `GET /api/resources` に `keyword` を追加（一覧表の概要、リクエスト例、クエリパラメータ表、挙動の注記）。`last_updated` を更新。
- `docs-next/docs/spec/screen-spec.md`: `/resources` の UI 要素表に「キーワード入力欄」を追加。`last_updated` を更新。

### バックエンド
- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java`: `searchByKeyword`、`searchByKeywordAndCategory`、`searchActiveByKeyword`、`searchActiveByKeywordAndCategory` の `@Query` を追加（`Sort` を受け取り `List` を返す。既存メソッドは変更なし）。
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java`: `keyword` 付きの `list` を追加し、5 引数版は `keyword = null` で委譲。正規化（`strip()`、空は指定なし）、LIKE パターン生成（小文字化、`!` `%` `_` を `!` でエスケープ）、`keyword` 経路（候補取得、期間による除外、手動ページネーション）を実装。既存の `listWithAvailabilityFilter` から `excludeOccupied` と `paginate` を取り出して共通化した。
- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`: `list` に `@RequestParam(required = false) String keyword` を追加。

### バックエンドのテスト
- `ResourceServiceTest`: `ListWithKeyword`（12 ケース）を追加。
- `ResourceControllerTest`: キーワード検索の結合テスト（13 ケース）と、検証用の追加リソース 3 件のセットアップ・後始末を追加。

### フロントエンド
- `frontend/src/server/actions/resources.ts`: `ListResourcesParams` に `keyword` を追加し、非空のときだけクエリに付与。
- `frontend/src/app/(authenticated)/resources/page.tsx`: `SearchParams` に `keyword` を追加し、Action とフォームに渡す。
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`: キーワード入力欄（`id="keyword"`、`data-testid="resource-filter-keyword-input"`）を追加。送信時に前後空白を除去し、空でなければ `keyword` を付与。`page` は付与しない。
- `frontend/tests/unit/server/actions/resources.test.ts`: `keyword` を渡す・渡さない場合の Vitest（2 ケース）を追加。

## 設計方針（計画）からの差分
- なし。5 点とも計画どおり。エスケープ文字は `!`（`requirements.md` の例示 `\` からの変更は計画で承認済み）。

## 実行したコマンドと結果

| コマンド | 結果 |
|---|---|
| `./gradlew spotlessApply compileJava`（`--offline`） | 成功 |
| `./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest"` | 成功（`ResourceControllerTest` 34 件、`ResourceServiceTest` 29 件。失敗 0） |
| `./gradlew test`（全件） | 成功（失敗・エラーなし） |
| `./gradlew checkstyleMain checkstyleTest` | 成功。警告は `checkstyleMain` が 2 件（`ReservationRepository` のメソッド名 `findByResource_IdAndStatusIn` など。既存で本変更とは無関係）、`checkstyleTest` が 151 件（既存のテストを含む。本変更分の個別確認はしていない） |
| `pnpm format`、`pnpm lint`、`pnpm format:check` | 成功（指摘なし） |
| `pnpm test` | 成功（10 ファイル、82 件） |
| `pnpm exec tsc --noEmit` | 成功（型エラーなし） |

## 確認できなかったこと
- **PostgreSQL での `LIKE ... ESCAPE '!'` と `LOWER(description)`（`TEXT` 列）の動作**: 生成時点では未確認だった（`curl` が承認待ちで実行できなかった）。その後、学習者が実施して期待どおりと確認した（`Docs/spec/aidlc-docs/construction/build-and-test/integration-test-instructions.md` の「実施結果」）。
- **画面での確認**（入力、解除、AND、ページ遷移後の引き継ぎ）: 未実施。ブラウザ操作ができないため。`PaginationNav` が `page` 以外の searchParams を引き継ぐことはコード（`pagination-nav.tsx` の `buildHref`）で確認した。
- **「リセット」ボタンの後の入力欄**: 既存のカテゴリ・期間と同じく、入力欄は非制御（`defaultValue`）のため、リセットで URL は `/resources` に戻るが入力欄の表示が消えるかは画面で未確認。
- **docs のビルド**: ローカルでは実行しない方針のため未実施（PR の CI「Docs Check / build」で確認する）。

## 判断を仰ぎたい点
- `docs-next/docs/spec/requirements.md`（UC-02 の機能要件表）には、キーワード検索の要件を追記していない。シートの「更新が必要な spec」に含まれず、既存の `RES-01`〜`RES-08` とシートの `RES-01`〜`RES-04` が ID として衝突するため。追記する場合は ID の振り直しが要る。
