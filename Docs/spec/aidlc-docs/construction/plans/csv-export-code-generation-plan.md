# Code Generation Plan: csv-export

## ユニットコンテキスト

- **実装するストーリー**: US-01（ダウンロード）・US-02（絞り込み）・US-03（アクセス拒否）
- **依存**: なし（既存の予約ドメイン・既存の Spring Security 設定・既存の admin レイアウトガードを再利用するのみ）
- **データベースエンティティ**: 新規テーブルなし。`ReservationCsvRow` は既存の `reservations`/`resources`/`users` テーブルへの読み取り専用クエリの射影結果であり、Flyway マイグレーションは不要
- **サービス境界**: `ReservationReportService`（新規）が本ユニットの唯一のユースケースサービス

## ワークスペースルート

`/workspace`（`Docs/spec/aidlc-state.md` より）。Brownfield のため既存の構造（`backend/src/main/java/com/example/bookflow/`、`frontend/src/`）にそのまま追加する。

## 実行ステップ

### Step 1: Spec-first ドキュメント更新（実装より先に行う）
- [x] `docs-next/docs/spec/requirements.md`：ユースケース一覧に UC-09 を追加、機能要件 RPT-01〜06 を記載
- [x] `docs-next/docs/spec/api-spec.md`：エンドポイント一覧に帳票出力の表を追加、§帳票出力セクションを新設
- [x] `docs-next/docs/spec/screen-spec.md`：画面一覧に `/admin/reports` を追加、§帳票出力の画面仕様を追加
- [x] `docs-next/docs/spec/enhancements/intermediate/csv-export.md`：誤った UC-07 参照を UC-09 に修正
- [x] `docs-next/docs/reference/adr/ADR-033-backend-csv-library.md` を新規作成（Michael Nygard 形式）
- [x] `docs-next/docs/reference/adr/index.md`：ADR 一覧表に ADR-033 の行を追加、バックエンド表の見出し範囲表記を更新

### Step 2: ビルド設定
- [x] `backend/build.gradle.kts`：`// ADR-033: CSV 帳票出力` コメント付きで `implementation("com.opencsv:opencsv:5.12.0")` を追加

### Step 3: バックエンド — Business Logic Generation（データモデル）
- [x] `backend/src/main/java/com/example/bookflow/domain/ReservationCsvRow.java` を新規作成（record）

### Step 4: バックエンド — Repository Layer Generation
- [x] `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java` に `streamCsvRowsForReport(...)` を追加（既存ファイルを直接編集）

### Step 5: バックエンド — Business Logic Generation（CSV 書き出し）
- [x] `backend/src/main/java/com/example/bookflow/application/ReservationCsvWriter.java` を新規作成

### Step 6: バックエンド — Business Logic Unit Testing
- [x] `backend/src/test/java/com/example/bookflow/application/ReservationCsvWriterTest.java` を新規作成（BOM・ヘッダー・列順・0件・日時書式・全ステータスラベル・数式インジェクション対策・CRLF・ストリーム非クローズを検証）

### Step 7: バックエンド — Business Logic Generation（ユースケースサービス）
- [x] `backend/src/main/java/com/example/bookflow/application/ReservationReportService.java` を新規作成

### Step 8: バックエンド — Business Logic Unit Testing
- [x] `backend/src/test/java/com/example/bookflow/application/ReservationReportServiceTest.java` を新規作成（Mockito。フィルタ正規化・Stream クローズを検証）

### Step 9: バックエンド — API Layer Generation
- [x] `backend/src/main/java/com/example/bookflow/presentation/ReportController.java` を新規作成

### Step 10: バックエンド — API Layer Unit Testing
- [x] `backend/src/test/java/com/example/bookflow/presentation/ReportControllerTest.java` を新規作成（`extends BaseControllerTest`。MEMBER 403 / APPROVER 403 / 無認証 401 / ADMIN 200 の4点セット、期間・ステータス絞り込み、`from > to` で 400）

### Step 11: フロントエンド — Frontend Components Generation（ナビゲーション）
- [x] `frontend/src/components/layout/nav-items.ts` の `ADMIN_ITEMS` に「帳票出力」を追加（既存ファイルを直接編集）

### Step 12: フロントエンド — Frontend Components Unit Testing
- [x] `frontend/tests/unit/layout/nav-items.test.ts` の `adminHrefs` 配列に `/admin/reports` を追加（既存ファイルを直接編集）

### Step 13: フロントエンド — Frontend Components Generation（純関数ヘルパ）
- [x] `frontend/src/lib/reports.ts` を新規作成

### Step 14: フロントエンド — Frontend Components Unit Testing
- [x] `frontend/tests/unit/lib/reports.test.ts` を新規作成

### Step 15: フロントエンド — Frontend Components Generation（Route Handler）
- [x] `frontend/src/app/api/reports/reservations/csv/route.ts` を新規作成

### Step 16: フロントエンド — Frontend Components Unit Testing
- [x] `frontend/tests/unit/msw/handlers.ts` に絶対 URL の CSV モックハンドラを追加（既存ファイルを直接編集）
- [x] `frontend/tests/unit/app/api/reports-csv-route.test.ts` を新規作成

### Step 17: フロントエンド — Frontend Components Generation（画面）
- [x] `frontend/src/app/(authenticated)/admin/reports/page.tsx` を新規作成
- [x] `frontend/src/app/(authenticated)/admin/reports/ReportExportClient.tsx` を新規作成（ボタン・入力に `data-testid` を付与）

### Step 18: Documentation Generation
- [x] `Docs/spec/aidlc-docs/construction/csv-export/code/summary.md` に生成ファイル一覧を記録

## ストーリートレーサビリティ

| ステップ | 対応ストーリー |
|---|---|
| Step 3〜10 | US-01・US-02・US-03（バックエンドの受け入れ基準すべて） |
| Step 11〜17 | US-01・US-02・US-03（フロントエンドの受け入れ基準すべて） |
