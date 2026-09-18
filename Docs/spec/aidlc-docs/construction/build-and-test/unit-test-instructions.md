# Unit Test Execution: csv-export

## バックエンド

### 1. 新規テストのみ実行

```bash
cd backend
./gradlew test --tests "*ReservationCsvWriterTest*" \
                --tests "*ReservationReportServiceTest*" \
                --tests "*ReportControllerTest*"
```

### 2. 実行結果（Code Generation ステージで確認済み）

| テストクラス | テスト数 | 結果 |
|---|---|---|
| `ReservationCsvWriterTest` | 18 | 全成功 |
| `ReservationReportServiceTest` | 8 | 全成功 |
| `ReportControllerTest` | 9 | 全成功 |

- **テストレポート**：`backend/build/test-results/test/TEST-*.xml`、`backend/build/reports/tests/test/index.html`
- **カバレッジ**：本リポジトリはカバレッジ計測ツール（JaCoCo 等）を導入していないため数値化しない。`ReservationCsvWriter` の全公開挙動（BOM・ヘッダー・列順・0件・日時書式・全5ステータスのラベル・数式インジェクション対策・CRLF・ストリーム非クローズ）と `ReportController` の認可4点セット（MEMBER 403 / APPROVER 403 / 無認証 401 / ADMIN 200）は個別テストで直接検証済み

### 3. テストが失敗した場合

1. `backend/build/reports/tests/test/index.html` で失敗内容を確認する
2. `ReportControllerTest` の 200 系テストが失敗する場合、`asyncDispatch(mvcResult)` の呼び出し漏れ（`asyncStarted()` の直後に呼ぶ必要がある）を疑う
3. 修正後、`./gradlew test` を再実行する

## フロントエンド

### 1. 新規テストのみ実行

```bash
cd frontend
pnpm test reports
pnpm test nav-items
```

### 2. 実行結果（Code Generation ステージで確認済み）

| テストファイル | テスト数 | 結果 |
|---|---|---|
| `tests/unit/lib/reports.test.ts` | 10 | 全成功 |
| `tests/unit/app/api/reports-csv-route.test.ts` | 7 | 全成功 |
| `tests/unit/layout/nav-items.test.ts`（更新分） | 12 | 全成功 |

### 3. 全体テストとの整合確認

```bash
cd frontend && pnpm test
```

97テスト全てが成功することを確認する（既存 85 + 新規 17 - 重複分）。

### 4. テストが失敗した場合

1. Route Handler のテストが「ハンドラが見つからない」旨で失敗する場合、`tests/unit/msw/handlers.ts` の CSV ハンドラが絶対 URL（`http://localhost:8080/...`）で登録されているか確認する（相対 URL `/api/backend/...` では一致しない）
2. BOM 関連のアサーションが失敗する場合、`res.text()` ではなく `res.arrayBuffer()` でバイト列を確認しているか見直す（`TextDecoder` は既定で BOM を除去する）
