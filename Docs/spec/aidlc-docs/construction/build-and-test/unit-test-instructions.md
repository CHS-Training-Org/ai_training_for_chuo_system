# Unit Test Execution

対象: Issue #23 リソース一覧の検索・フィルタ追加（`resource-list-filter`）。

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
# Frontend（Vitest）
cd frontend && pnpm test
# 単一ファイル／パターン指定
cd frontend && pnpm test reservations

# Backend（JUnit 5 + H2 + Mockito）
cd backend && ./gradlew test
# 特定テストクラスのみ
cd backend && ./gradlew test --tests "*ReservationServiceTest"
```

静的検査（必須確認項目）:

```bash
cd frontend && pnpm lint
cd backend && ./gradlew checkstyleMain
```

その他の確認（必須確認項目ではないが、今回実施した）:

```bash
cd frontend && pnpm format:check
cd backend && ./gradlew spotlessCheck
```

### 2. Review Test Results

- **Expected**: 全テストが成功し、failures 0、errors 0。
- **Test Coverage**: カバレッジは計測していない（確認できていない）。
- **Test Report Location**: Backend のレポートの出力先は今回の作業で確認していない。Gradle の標準出力先と思われるが、記録はない。

### 今回の変更に関係するテスト

| 領域 | テスト | 件数 | 備考 |
|---|---|---|---|
| Backend | `ResourceSpecificationsTest` | 7 | `escapeLike` の単体テスト（新規） |
| Backend | `ResourceRepositoryTest` | 13 | 実クエリ（H2）。`@SpringBootTest` + `@Transactional`（新規） |
| Backend | `ResourceServiceTest` | 19 | `List_` は既存 4 件 + 新規 2 件 |
| Backend | `ResourceControllerTest` | 31 | 新規 10 件（`keyword` の実 DB テスト）を含む |
| Frontend | `tests/unit/server/actions/resources.test.ts` | 追加 4 件 | `keyword` の付与・未指定・空文字・併用 |
| Frontend | `tests/unit/resources/resource-filter-form.test.tsx` | 8 | キーワード入力・送信・リセット（新規） |

Backend の Repository・Controller のテストは共有 DB を前提に、絶対件数ではなく、一意なトークン `ZZ-FILTER-` を含む自分の投入行の ID で検証している。

### 3. Fix Failing Tests

失敗した場合:

1. 出力から失敗したテストケースを特定する。
2. コードを修正する。
3. 全件成功するまで再実行する。
