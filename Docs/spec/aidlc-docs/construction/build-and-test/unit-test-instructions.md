# Unit Test Execution — `resource-keyword-search`

## 全テストの実行

```bash
# バックエンド
cd backend && ./gradlew test

# フロントエンド
cd frontend && pnpm test
```

## 本ユニットに対応するテストだけを実行する

```bash
cd backend && ./gradlew test --tests "*ResourceSpecificationsTest"
cd backend && ./gradlew test --tests "*ResourceServiceTest"
cd backend && ./gradlew test --tests "*ResourceControllerTest"

cd frontend && pnpm test resource
```

## 実測結果

### バックエンド（155 tests / 0 failures / 0 errors / 0 skipped）

| テストクラス | 件数 | 本ユニットでの変化 |
|---|---:|---|
| `ResourceSpecificationsTest$NormalizeKeyword` | 8 | 新規 |
| `ResourceSpecificationsTest$UnrestrictedCases` | 4 | 新規 |
| `ResourceControllerTest` | 39 | 16 件追加（23 → 39） |
| `ResourceServiceTest$List_` | 6 | 2 件追加（4 → 6） |
| `ResourceServiceTest$Overlaps` | 7 | 変更なし |
| `ResourceServiceTest$Get` | 2 | 変更なし |
| `ResourceServiceTest$Availability` | 4 | 変更なし |
| `ApprovalServiceTest`（4 ネスト） | 17 | 変更なし |
| `ReservationServiceTest`（4 ネスト） | 19 | 変更なし |
| `ApprovalControllerTest` | 16 | 変更なし |
| `ReservationControllerTest` | 19 | 変更なし |
| `AuthControllerTest` | 4 | 変更なし |
| `DepartmentControllerTest` | 4 | 変更なし |
| `UserControllerTest` | 5 | 変更なし |
| `BookflowApplicationTests` | 1 | 変更なし |

### フロントエンド（90 tests / 11 files / 0 failures）

| テストファイル | 件数 | 本ユニットでの変化 |
|---|---:|---|
| `tests/unit/resource-filter-href.test.ts` | 7 | 新規 |
| `tests/unit/server/actions/resources.test.ts` | 13 | 2 件追加（11 → 13） |
| `tests/unit/pagination-nav.test.ts` | 11 | 1 件追加（10 → 11） |
| その他 8 ファイル | 59 | 変更なし |

### テストレポートの場所

- バックエンド：`backend/build/reports/tests/test/index.html`、`backend/build/test-results/test/*.xml`
- フロントエンド：Vitest は既定でレポートファイルを出力しない。標準出力を参照する

### カバレッジ

本リポジトリはカバレッジ計測ツール（JaCoCo・Vitest coverage）を導入していないため、カバレッジ率の目標値は設定しない。代わりに受入基準（AC）とテストの対応で被覆を管理する（`build-and-test-summary.md` の対応表を参照）。

## テストが失敗した場合

1. バックエンドは `backend/build/reports/tests/test/index.html` を開き、失敗したテストのスタックトレースを確認する
2. フロントエンドは標準出力の差分表示を確認する
3. コードを修正して再実行する

### キーワード検索に固有の失敗パターン

| 症状 | 想定される原因 |
|---|---|
| `list_withPercentInKeyword_doesNotMatchAsWildcard` と `list_withUnderscoreInKeyword_doesNotMatchAsWildcard` が落ちる | `escapeLikePattern` のエスケープが効いていない、または置換の順序が誤っている（バックスラッシュを最初に処理する必要がある） |
| 上記 2 件が SQL やドライバ層の例外で落ちる | エスケープ文字 `\` が方言側で解釈されていない。`ESCAPE_CHAR` を `'!'` に変更する（エスケープ自体は外さない） |
| `list_withLowercaseKeyword_matchesUppercaseDescription` が落ちる | `LOWER()` 比較が片側にしか適用されていない |
| `list_withKeywordAndNullDescription_returnsResourceMatchedByName` が落ちる | `description` が NULL の行を除外する条件（`COALESCE` 等の不要な回避策）が入っている |
| `list_withKeywordAndTimeRange_appliesBothFilters` だけが落ちる | 述語が `from`/`to` 指定ありの経路に適用されていない |
| `list_withBlankKeyword_behavesAsUnspecified` が落ちる | 空白のみの入力が正規化されず、空白そのものが照合されている |
