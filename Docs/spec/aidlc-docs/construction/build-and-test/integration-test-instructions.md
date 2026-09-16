# Integration Test Instructions — `resource-keyword-search`

## 位置づけ

BookFlow の結合テストは、独立したテストスイートではなく `./gradlew test` の一部として実行される。`ResourceControllerTest` は `@SpringBootTest` で Spring コンテキスト全体を起動し、H2 インメモリ DB に実データを投入したうえで MockMvc から HTTP レイヤーを叩く。したがって presentation から domain を経て SQL 生成に至るまでが 1 本のテストで検証される。

キーワード検索は述語が生成する SQL の挙動に依存するため、**実 DB に対する結合テストが主要な検証手段**である。モックを用いる `ResourceServiceTest` では述語の中身を観測できない。

## テストシナリオ

### シナリオ 1: presentation 層から domain 層の述語生成まで

- **検証内容**：`keyword` クエリパラメータが `ResourceController` から `ResourceService` を経て `ResourceSpecifications` に渡り、生成された SQL が期待どおりの行を返すこと
- **セットアップ**：`@BeforeEach` の `insertSeedData` が部署 1 件、ユーザー 3 件（MEMBER / ADMIN / APPROVER）、リソース 5 件、予約 1 件を投入する
- **実行**：`ResourceControllerTest` の `list_withKeyword*` 系テスト
- **期待結果**：下表のとおり
- **クリーンアップ**：`@AfterEach` の `deleteSeedData` が投入した行を外部キーの依存順に削除する

### シナリオ 2: 絞り込み条件の組み合わせ

- **検証内容**：キーワード・カテゴリ・空き確認期間が AND で組み合わさること。とくに `ResourceService.list` の 2 つの内部経路の双方に述語が適用されること
- **実行**：`list_withKeywordAndCategory_appliesBothFilters`、`list_withKeywordAndTimeRange_appliesBothFilters`、`list_withKeywordCategoryAndTimeRange_appliesAllFilters`
- **期待結果**：3 条件同時指定では「大会議室」のみが残る（「第1会議室」は占有により、「会議車両」はカテゴリにより除外される）

### シナリオ 3: ロール別の可視範囲

- **検証内容**：キーワード検索でも `isActive` の可視範囲が維持されること
- **実行**：`list_adminWithKeywordMatchingInactive_includesInactiveResource`、`list_memberWithKeywordMatchingInactive_excludesInactiveResource`、`list_approverWithKeywordMatchingInactive_excludesInactiveResource`
- **期待結果**：ADMIN のみ無効リソース（「旧備品A」）が結果に含まれる

## シードデータ

| ID 末尾 | 名称 | カテゴリ | `isActive` | `description` | 用途 |
|---|---|---|---|---|---|
| `...010` | 第1会議室 | ROOM | true | NULL | 既存。占有予約あり。アンダースコアのワイルドカード検証にも使う |
| `...011` | 旧備品A | EQUIPMENT | **false** | NULL | 既存。ロール別可視範囲の検証 |
| `...012` | 大会議室 | ROOM | true | `Projector 完備` | 説明文一致・大文字小文字非依存の検証 |
| `...013` | 50%OFF備品_旧型 | EQUIPMENT | true | NULL | ワイルドカードのリテラル扱いの検証 |
| `...014` | 会議車両 | VEHICLE | true | NULL | `description` が NULL でも名称一致で返ることと、カテゴリ条件の識別 |

予約は `...010`（第1会議室）に対する `APPROVED`・2025-06-02 10:00〜12:00 の 1 件。

### APPROVER ユーザーについて

`@WithMockApprover` の既定 `sub` は `test-approver-sub` である。`CurrentUserArgumentResolver` が JWT の `sub` を `users.cognito_sub` で解決するため、対応するユーザー行がないと未登録ユーザーとして扱われる。本ユニットでこの行をシードに追加した。

## 実行環境のセットアップ

外部サービスの起動は不要である。

```bash
cd backend && ./gradlew test --tests "*ResourceControllerTest"
```

`backend/src/test/resources/application-test.yml` が H2（`MODE=PostgreSQL`）を指定し、`ddl-auto: create-drop` でエンティティから DDL を生成する。Flyway はテストでは無効化されている。認証は `MockJwtSecurityContextFactory` がスタブ JWT を生成するため Cognito への接続も発生しない。

## 本番 DB との差異に関する注意

テストは H2 の PostgreSQL 互換モードで実行されるが、互換性は完全ではない。キーワード検索の実装では次の 2 点でこの差異を回避している。

1. **`ILIKE` を使わない**。大文字小文字の非依存は `LOWER()` 比較で実現する
2. **エスケープ文字を明示する**。`LIKE ... ESCAPE '\'` の形で指定し、方言の既定値に依存しない

本ユニットの実装では `\` が H2 で問題なく解釈されることを確認済みである。将来 PostgreSQL 側でのみ挙動が異なる事象が出た場合は、エスケープ文字を `!` に変更する（`ResourceSpecifications.ESCAPE_CHAR`）。

## クリーンアップ

`@AfterEach` が自動で行う。テストが異常終了した場合も、H2 はインメモリかつ `create-drop` のため Gradle プロセス終了時に破棄される。
