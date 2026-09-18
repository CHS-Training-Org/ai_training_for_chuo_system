# Integration Test Instructions: csv-export

## 目的

バックエンドの `ReportController` → `ReservationReportService` → `ReservationRepository` の結合と、
Spring Security・トランザクション境界（`StreamingResponseBody` の非同期コールバック）が実際に機能することを確認する。

本タスクの結合テストは `ReportControllerTest`（`extends BaseControllerTest`、H2 インメモリ DB・実際の Spring コンテキスト）
がその役割を兼ねており、別立てのシナリオを追加で用意する必要はない。

## テストシナリオ（`ReportControllerTest` で自動化済み）

### シナリオ1: ADMIN が全件ダウンロードする

- **設定**：MEMBER 1名の予約3件（2026-09-01 APPROVED・2026-09-15 PENDING・2026-09-30 CANCELLED、目的に `=1+1` を含む）を JdbcTemplate で投入
- **実行**：`@WithMockAdmin` で `GET /api/reports/reservations/csv` を呼び出す
- **期待結果**：200・UTF-8 BOM・日本語ヘッダー・3件すべて（他ユーザー分の絞り込みなし）・`=1+1` が `'=1+1` にサニタイズされている

### シナリオ2: 期間・ステータスで絞り込む

- **実行**：`?from=2026-09-15T00:00:00&to=2026-09-30T23:59:59` および `?status=APPROVED`
- **期待結果**：期間内の2件・ステータス一致の1件のみが含まれる

### シナリオ3: 権限のないロール・無認証でアクセスする

- **実行**：`@WithMockMember`・`@WithMockApprover`・匿名でそれぞれ呼び出す
- **期待結果**：403（`FORBIDDEN`）・403・401（`UNAUTHORIZED`）

## 手動確認手順（実アプリでのみ検証できる部分）

自動テストは MockMvc 経由であり、ブラウザの実際のダウンロード動作・Route Handler を経由した認証トークンの受け渡しまでは検証できない。以下は実アプリでの確認が必要。

### 1. ローカル環境を起動する

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
cd backend && ./gradlew bootRun &
cd frontend && pnpm dev &
```

### 2. ADMIN としてダウンロードする

1. サインイン画面の開発専用ロール別ログインボタンで ADMIN としてログインする
2. `/admin/reports` を開く
3. 期間・ステータスを未指定のままダウンロードし、全件が出ることを確認する
4. 期間とステータスを指定し、絞り込みが効いた CSV が落ちることを確認する
5. ダウンロードした CSV を Excel で開き、日本語ヘッダ・日時が文字化けなく表示されることを確認する（UTF-8 BOM の実効性確認）

### 3. MEMBER としてアクセス拒否を確認する

1. MEMBER としてログインし直す
2. サイドナビに「帳票出力」が表示されないことを確認する
3. `/admin/reports` に直接アクセスすると 403 画面になることを確認する

### 4. クリーンアップ

```bash
docker compose -f .devcontainer/docker-compose.yml down
```
