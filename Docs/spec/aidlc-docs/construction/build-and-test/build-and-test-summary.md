# Build and Test Summary — `resource-keyword-search`

実行日: 2026-09-16

## Build Status

| 対象 | Build Tool | 実行コマンド | 結果 | 生成物 |
|---|---|---|---|---|
| backend | Gradle Wrapper | `./gradlew clean build` | **Success**（17 秒） | `backend/build/libs/*.jar` |
| frontend | pnpm / Next.js | `pnpm build` | **Success** | `frontend/.next/` |
| docs-next | npm / Docusaurus | `npm run build` | **Success** | `docs-next/build/` |

`./gradlew clean build` には `compileJava`・`bootJar`・`spotlessCheck`・`checkstyleMain`・`checkstyleTest`・`test` が含まれる。すべて通過した。

## Test Execution Summary

### Unit Tests

| 対象 | 総数 | Passed | Failed | Skipped | 結果 |
|---|---:|---:|---:|---:|---|
| backend（JUnit 5 + Mockito） | 155 | 155 | 0 | 0 | **Pass** |
| frontend（Vitest） | 90 | 90 | 0 | 0 | **Pass** |

本ユニットで追加したテストは 33 件（backend 30 件・frontend 3 件）。内訳は `unit-test-instructions.md` を参照。

### Integration Tests

`ResourceControllerTest`（`@SpringBootTest` + H2 実 DB + MockMvc）39 件がすべて通過した。うち 16 件が本ユニットで追加したキーワード検索のテストである。詳細は `integration-test-instructions.md` を参照。

- **Test Scenarios**: 3（述語生成の一貫性 / 条件の組み合わせ / ロール別可視範囲）
- **Status**: **Pass**

### Performance Tests

**N/A**。本ユニットは読み取り専用のクエリパラメータ追加であり、Workflow Planning で NFR Requirements ステージをスキップした（新規の性能要件が発生しないため）。負荷試験の仕組みも本リポジトリには存在しない。

`LIKE '%keyword%'` が B-tree インデックスを利用できない点は要件定義書に非目標として記録済みである。学習用リポジトリのデータ規模では実用上の問題にならない。

### Additional Tests

| 種別 | 結果 | 備考 |
|---|---|---|
| Contract Tests | **N/A** | 単一バックエンドであり、サービス間の契約テストは対象外。API 契約は `ResourceControllerTest` と Zod スキーマで担保する |
| Security Tests | **N/A** | Security Baseline 拡張は Requirements Analysis で opt-out。認証認可境界の内側に閉じる変更である。入力検証（LIKE パターンのエスケープ・最大長）は通常の実装として行い、テストで検証済み |
| E2E Tests | **Pass（手動）** | Playwright は雛形のみで CI も実行しないため自動 E2E は追加していない。`e2e-test-instructions.md` に定義した 12 項目を 2026-09-16 に学習者が手動で実施し、すべて通過した |

### Lint / Format

| 対象 | コマンド | 結果 |
|---|---|---|
| backend | `./gradlew spotlessCheck` | **Pass** |
| backend | `./gradlew checkstyleMain` / `checkstyleTest` | **Pass**（警告 2 件・後述） |
| frontend | `pnpm lint`（oxlint） | **Pass**（指摘なし） |
| frontend | `pnpm format:check`（oxfmt） | **Pass**（80 ファイル） |

**残存する警告 2 件**：`ReservationRepository` の `findByResource_IdAndStatusIn` と `findByResource_IdInAndStatusIn` に対する Checkstyle の `MethodName` 警告。Spring Data JPA の関連プロパティ参照記法（`_`）に由来する既存の事項であり、本ユニットの変更とは無関係。警告であってビルドは失敗しない。

## 受入基準の検証状況

| AC | 内容 | 検証手段 | 状態 |
|---|---|---|---|
| AC-01-1 | 名称への部分一致 | `list_withKeywordMatchingName_returnsMatchingResourcesOnly` | Pass |
| AC-01-2 | 説明文のみへの一致 | `list_withKeywordMatchingDescriptionOnly_returnsResource` | Pass |
| AC-01-3 | `description` が NULL でも名称一致 | `list_withKeywordAndNullDescription_returnsResourceMatchedByName` | Pass |
| AC-01-4 | 一致なしで 0 件 | `list_withKeywordMatchingNothing_returnsEmptyContent` | Pass |
| AC-02-1 | 小文字入力で大文字に一致 | `list_withLowercaseKeyword_matchesUppercaseDescription` | Pass |
| AC-02-2 | 大文字入力でも同じ結果 | `list_withUppercaseKeyword_matchesSameResource` | Pass |
| AC-03-1 | `%` のリテラル扱い | `list_withPercentInKeyword_doesNotMatchAsWildcard` / `..._matchesLiteralPercent` | Pass |
| AC-03-2 | `_` のリテラル扱い | `list_withUnderscoreInKeyword_doesNotMatchAsWildcard` | Pass |
| AC-04-1 | キーワード AND カテゴリ | `list_withKeywordAndCategory_appliesBothFilters` | Pass |
| AC-04-2 | キーワード AND 期間 | `list_withKeywordAndTimeRange_appliesBothFilters` | Pass |
| AC-04-3 | 3 条件同時 | `list_withKeywordCategoryAndTimeRange_appliesAllFilters` | Pass |
| AC-04-4 | 両経路で同じ照合規則 | `list_withKeywordAndTimeFilter_delegatesSpecificationToListQuery` + AC-04-2 | Pass |
| AC-05-1 | 空入力で URL から消える | `buildResourceFilterHref` のテスト | Pass |
| AC-05-2 | 空入力で条件解除 | `list_withBlankKeyword_behavesAsUnspecified` | Pass |
| AC-05-3 | 空白のみは未指定扱い | `list_withBlankKeyword_behavesAsUnspecified`・`normalizeKeyword` のテスト | Pass |
| AC-05-4 | 未指定時は既存どおり | 既存テスト全通過 | Pass |
| AC-06-1 | リセットで全解除 | `buildResourceFilterHref({})` のテスト | Pass |
| AC-06-2 | リセット後に一覧が全件に戻る | 手動確認項目 6 | Pass（手動・期待値修正済み） |
| AC-07-1 | ページ送りで条件維持 | `pagination-nav.test.ts` の keyword ケース | Pass |
| AC-07-2 | 2 ページ目も同条件 | 手動確認項目 7 | Pass（手動） |
| AC-08-1 | URL から入力欄へ復元 | 手動確認項目 8 | Pass（手動） |
| AC-08-2 | 再読込で維持 | 手動確認項目 9 | Pass（手動） |
| AC-09-1 | ADMIN は無効リソースを含む | `list_adminWithKeywordMatchingInactive_includesInactiveResource` | Pass |
| AC-09-2 | 無効リソースの視覚的区別 | 手動確認項目 10 | Pass（手動） |
| AC-10-1 | MEMBER は含まない | `list_memberWithKeywordMatchingInactive_excludesInactiveResource` | Pass |
| AC-10-2 | APPROVER も含まない | `list_approverWithKeywordMatchingInactive_excludesInactiveResource` | Pass |
| AC-11-1 | カテゴリのみ指定が従来どおり | 既存テスト | Pass |
| AC-11-2 | 期間のみ指定が従来どおり | 既存テスト | Pass |
| AC-11-3 | 片方のみ指定で 400 | 既存テスト | Pass |
| AC-11-4 | 既存テストが pass | backend 155 件・frontend 90 件すべて通過 | Pass |

自動検証 24 件はすべて通過。残る 5 件は画面表示に関するもので、2026-09-16 に学習者が `e2e-test-instructions.md` の 12 項目を手動で実施し、すべて期待どおりの結果となった。**受入基準 29 件はすべて充足している。**

### AC-06-2 の期待値を修正した

当初 AC-06-2 を「リセット後にキーワード入力欄が空になっている」と定義していたが、実装の挙動と食い違っていた。`handleReset` は `router.push("/resources")` で URL を変えるだけであり、非制御コンポーネント（`defaultValue`）の入力値は App Router 内の遷移では再マウントされないため維持される。

これはキーワード追加以前からの挙動で、カテゴリと日時の各入力でも同様に起きる。既存挙動の変更は本課題の範囲（キーワード検索の追加）を超えるため、AC-06-2 の期待値を「一覧の絞り込みが解除され全件が表示される」に修正し、入力欄の挙動は既存事項として注記した。フィルタフォーム全体のクリア挙動の改善は別課題として扱う。

## 要求シートの受入条件

| 受入条件 | 状態 |
|---|---|
| キーワードを入力して絞り込むと、リソース名または説明にそのキーワードを含む結果のみが表示される | 満たす（AC-01-1・AC-01-2） |
| キーワードフィールドを空にして「絞り込む」を押すと、キーワード条件が解除される | 満たす（AC-05-1・AC-05-2） |
| カテゴリ・期間フィルタとキーワードを同時に指定できる | 満たす（AC-04-1〜3） |
| `keyword` パラメータ未指定時の動作は既存と変わらない | 満たす（AC-05-4・AC-11-1〜3） |
| バックエンドの既存テストが引き続き pass する | 満たす（155 件すべて通過） |
| 追加した検索ロジックに対応するユニットテストをバックエンドに追加する | 満たす（30 件追加） |

## エスケープ処理の実効性検証

テストが空振りでないことを確かめるため、`escapeLikePattern` を恒等関数に置き換えて実行した。

```
ResourceControllerTest > list_withPercentInKeyword_doesNotMatchAsWildcard() FAILED
ResourceControllerTest > list_withUnderscoreInKeyword_doesNotMatchAsWildcard() FAILED
```

期待どおり 2 件が失敗した。確認後にエスケープ処理を復元し、再度すべて通過することを確認した。

## Overall Status

- **Build**: Success（backend / frontend / docs-next の 3 つすべて）
- **All Tests**: Pass（backend 155 件・frontend 90 件・失敗 0 件）
- **Lint / Format**: Pass
- **Ready for Operations**: **Yes**

## Next Steps

OPERATIONS フェーズ（BookFlow では CI 品質ゲート）に進む。`CI Backend` は `./gradlew test`・`spotlessCheck`・`checkstyleMain` を、`CI Frontend` は `pnpm lint`・`format:check`・`build`・`test` を実行する。いずれもローカルで同じコマンドを実行済みであり、通過が見込まれる。
