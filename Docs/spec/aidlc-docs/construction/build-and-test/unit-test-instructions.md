# Unit Test Execution

対象: Issue #29 CSV 帳票出力（`csv-export`）。

## Run Unit Tests

### 1. Execute All Unit Tests

```bash
# Frontend（Vitest）
cd frontend && pnpm test
# 単一ファイル／パターン指定
cd frontend && pnpm test reports

# Backend（JUnit 5 + H2 + Mockito）
cd backend && ./gradlew test
# 特定テストクラスのみ
cd backend && ./gradlew test --tests "*ReservationCsvWriterTest"
```

静的検査:

```bash
cd frontend && pnpm lint
cd frontend && pnpm format:check
cd frontend && npx tsc --noEmit
cd backend && ./gradlew spotlessCheck
cd backend && ./gradlew checkstyleMain
```

### 2. Review Test Results

- **Expected**: 全テストが成功し、failures 0、errors 0、skipped 0。
  - Backend: 25 クラス・200 件
  - Frontend: 14 ファイル・112 件
- **Test Coverage**: カバレッジは計測していない。
- **Test Report Location**: Backend は `backend/build/reports/tests/test/index.html`（結果 XML は `backend/build/test-results/test/`）。Frontend は標準出力。

### 今回の変更で追加したユニットテスト

| テスト | 件数 | 主な内容 |
|---|---|---|
| `ReservationCsvWriterTest` | 13 | BOM、日本語ヘッダ、0 件、日時の書式、5 つのステータスの表示名、RFC 4180 のエスケープ、CRLF、入力順の維持、UTF-8 |
| `ReservationReportServiceTest` | 5 | 開始日時昇順の Sort、条件なし、ステータスが null・空、0 件はヘッダのみ、返却順の維持 |
| `reports.test.ts` | 9 | BOM の保持、ファイル名の取り出し（フォールバック含む）、日時の正規化、status の繰り返しキー、空の値は付与しない、403・400 |
| `api-client.test.ts` | 4 | `getText` の BOM 保持、ヘッダの返却、params、非 2xx |
| `csv-export-dialog.test.tsx` | 7 | ダイアログの表示と文言、入力値の受け渡し、Blob（BOM 付き）のダウンロード、失敗時のトースト、キャンセル |

### 3. Fix Failing Tests

失敗した場合:

1. Backend は `backend/build/reports/tests/test/index.html`、Frontend は標準出力を確認する。
2. 失敗したテストを特定し、原因を調べて修正する。テストの期待値を緩めて通さない。
3. 全件 pass するまで再実行する。
