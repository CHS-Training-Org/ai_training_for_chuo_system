# Generation Summary — `resource-keyword-search`

実行日: 2026-09-16
計画: `Docs/spec/aidlc-docs/construction/plans/resource-keyword-search-code-generation-plan.md`

## 新規作成したファイル

| パス | 内容 |
|---|---|
| `backend/src/main/java/com/example/bookflow/domain/ResourceSpecifications.java` | 絞り込み述語の組み立てユーティリティ。キーワードの正規化・LIKE パターンのエスケープ・3条件の AND 合成 |
| `backend/src/test/java/com/example/bookflow/domain/ResourceSpecificationsTest.java` | 正規化規則の単体テスト（11件） |
| `frontend/tests/unit/resource-filter-href.test.ts` | URL 組み立ての単体テスト（7件） |

## 変更したファイル

| パス | 変更内容 |
|---|---|
| `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` | `JpaSpecificationExecutor<Resource>` を継承。派生クエリメソッド6個を削除。`findByIdForUpdate` は維持 |
| `backend/src/main/java/com/example/bookflow/application/ResourceService.java` | `list` に `keyword` を追加。述語を分岐前に1回合成し2経路で共有。`listPaginated` と `listWithAvailabilityFilter` を述語ベースに置換。`fetchAllCandidates` を削除 |
| `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` | `keyword` の `@RequestParam` と 100 文字検証を追加 |
| `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` | 一覧系スタブを `findAll(Specification, ...)` に書き換え。委譲テスト2件を追加。APPROVER 以外の変更なし |
| `backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java` | キーワード検索用のシード3件と APPROVER ユーザーを追加。テスト16件を追加 |
| `frontend/src/server/actions/resources.ts` | `ListResourcesParams.keyword` とクエリ組み立てを追加 |
| `frontend/src/app/(authenticated)/resources/page.tsx` | `SearchParams.keyword`、Server Action への受け渡し、`defaultKeyword` の受け渡し |
| `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` | キーワード入力欄を追加。URL 組み立てを `buildResourceFilterHref` として切り出し。グリッドを4列対応に変更 |
| `frontend/tests/unit/server/actions/resources.test.ts` | `keyword` の送出と非送出のテスト2件を追加 |
| `frontend/tests/unit/pagination-nav.test.ts` | `keyword` がページ送りで引き継がれるテスト1件を追加 |

重複ファイル（`ClassName_modified.java` 等）は生成していない。

## 計画から外れた点

### APPROVER ユーザーをシードに追加した

計画では `ResourceControllerTest` に追加するシードをリソース3件としていたが、`@WithMockApprover` を使うテスト（AC-10-2）を実行するには APPROVER ロールのユーザー行が必要だった。`CurrentUserArgumentResolver` が JWT の `sub` を `users.cognito_sub` で解決するため、行が無いと未登録ユーザーとして扱われる。`test-approver-sub` に対応するユーザーを追加した。

### シードリソースの名称を変更した

計画では3件目を「車両サンプル」としていたが、「会議車両」に変更した。カテゴリ条件のテスト（AC-04-1）で「キーワードには一致するがカテゴリで除外される」リソースが必要であり、「車両サンプル」ではキーワード `会議` に一致しないため条件の識別ができなかった。「会議車両」にすることで、同じ1件が AC-01-3（説明が NULL でも名称一致で返る）と AC-04-1 の双方で機能する。

## エスケープ処理の検証

ワイルドカードのテストが実際に機能することを、エスケープ処理を意図的に無効化して確認した。`escapeLikePattern` を恒等関数に置き換えたところ、次の2件が失敗した。

- `list_withPercentInKeyword_doesNotMatchAsWildcard`
- `list_withUnderscoreInKeyword_doesNotMatchAsWildcard`

確認後にエスケープ処理を元に戻し、再度すべて通過することを確認した。エスケープ文字 `\` は H2 の PostgreSQL 互換モードで問題なく解釈されたため、代替（`!`）への切り替えは不要だった。

## ストーリーの実装状況

- [x] ST-01 キーワードで一覧を絞り込む
- [x] ST-02 大文字小文字を意識せずに検索する
- [x] ST-03 記号を含む語句をそのまま検索する
- [x] ST-04 キーワードとカテゴリ・期間を組み合わせる
- [x] ST-05 キーワード条件だけを解除する
- [x] ST-06 すべてのフィルタを一度に解除する
- [x] ST-07 キーワードを保ったままページを送る
- [x] ST-08 入力したキーワードが画面に残る
- [x] ST-09 管理者が無効リソースを検索で見つける
- [x] ST-10 一般社員の検索結果に無効リソースが現れない
- [x] ST-11 既存のフィルタ操作が変わらない

## 非目標（実装していないこと）

- 全文検索インデックス（`pg_trgm`・`tsvector` 等）の導入。`LIKE '%...%'` は B-tree インデックスを使えないが、学習用リポジトリのデータ規模では問題にならない
- `from` / `to` 指定時の手動ページネーションの改善
- 検索対象への `location` の追加
- 空白区切りによる複数語の AND 分解
