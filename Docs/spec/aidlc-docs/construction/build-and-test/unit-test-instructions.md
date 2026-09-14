# Unit Test Execution — Unit: csv-export

## バックエンド（新規テストのみを対象に実行する場合）

```bash
cd backend
./gradlew test --tests "*ReportServiceTest" --tests "*ReportControllerTest"
```

- **期待結果**: 18 テスト（`ReportServiceTest` 10件・`ReportControllerTest` 8件）が全て成功
- **観点**:
  - `ReportServiceTest`: 期間×ステータスの4分岐によるリポジトリ呼び出しの分岐、CSV列マッピング・日本語ステータスラベル・日時フォーマット、カンマ/ダブルクォート/改行のエスケープ、UTF-8 BOM付与、対象0件時のヘッダのみ出力
  - `ReportControllerTest`: ADMIN限定アクセス（`@PreAuthorize`）、MEMBER/APPROVERへの403、`from`/`to`片方指定時の400、期間・ステータス絞り込みの反映

## バックエンド（全体）

```bash
cd backend
./gradlew test
```

- **期待結果**: 154 テスト全て成功（既存133件 + 本ユニット新規21件）
- **テストレポート**: `backend/build/reports/tests/test/index.html`

## フロントエンド（新規テストのみ）

```bash
cd frontend
pnpm test CsvExportControls
```

- **期待結果**: 4 テスト全て成功（両方空で活性・片方入力でaria-disabled・両方入力時のクエリ反映・初期値反映）

## フロントエンド（全体）

```bash
cd frontend
pnpm test
```

- **期待結果**: 93 テスト全て成功（既存89件 + 本ユニット新規4件）

## 失敗時の対応

テストが失敗した場合、レポート（バックエンドは上記HTML、フロントエンドは `vitest run` の標準出力）で失敗ケースを確認し、`Docs/spec/aidlc-docs/construction/csv-export/functional-design/business-rules.md` の該当規則と実装を照合してから修正する。
