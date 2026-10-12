# E2E Test Instructions（usage-report）

## 判定: 自動 E2E は追加も実行もしない

- **追加しない理由**: 本ユニットの Code Generation 計画は E2E の新規追加をスコープに含めない。既存 E2E の整備は別課題（既存機能の E2E テスト追加）で扱う
- **既存スイートを実行しない理由**: 次の 2 点から、既存スイートが本ユニットの変更で壊れる経路はないと判断した
  - `frontend/tests/e2e/` にサイドナビ、管理者メニュー、`/admin/*` への参照がない（grep で確認）
  - 本ユニットは管理者メニューへの項目追加と `/admin/reports` の新設で、既存の画面と操作は変えない
- **実行環境の制約**: 既存 E2E は PostgreSQL と cognito-local を起動した状態が前提で、本検証の環境ではそれらのコンテナが稼働していなかったため実行していない

## 手動での動作確認手順（未実施。PR 前に学習者が確認する）

ビルドとテストでは、API の集計規則、権限、ページの表示・エラー処理、フォームの検証までを確認済み。次の 2 つは未確認のため、実機で確認する。

### A. PostgreSQL での集計の実行

テストは H2（PostgreSQL 互換モード）のみで、JPQL の構築子式 `SELECT new ...ApprovedUsage(r.resource.id, r.startAt, r.endAt)` を PostgreSQL 上で実行していない。

1. `docker compose -f .devcontainer/docker-compose.yml up -d` で PostgreSQL と cognito-local を起動し、`cd backend && ./gradlew bootRun` で起動する（起動時に Flyway と Hibernate の検証が通ること）
2. ADMIN の ID トークンで `GET /api/statistics/resources` と `?from=...&to=...`（秒付き ISO）を呼び、200 と配列が返ること、`r.resource.id` の射影でエラー（`LazyInitializationException`、構文エラー等）が出ないことを確認する

### B. ブラウザでの画面確認

1. `cd frontend && pnpm dev` を起動し、サインイン画面の「開発専用ロール別ログインボタン」で **ADMIN** としてログインする
2. サイドナビに「利用実績」があり、`/admin/reports` を開くと、棒グラフ 2 本（予約件数、合計利用時間）と表が表示されることを確認する（期間未指定は全期間）
3. 期間を入力して「集計する」を押すと URL が更新されてグラフと表が再描画されること、片方だけ入力、または開始日時が終了日時以降の入力ではメッセージが出て遷移しないこと、「リセット」で全期間に戻ることを確認する
4. 予約を作って承認し、件数と合計時間が増えること、期間の境界をまたぐ予約が期間で切り詰められること、実績のない有効なリソースが 0 件で表示されることを確認する
5. **MEMBER** と **APPROVER** でログインして、サイドナビに「利用実績」が出ないこと、`/admin/reports` を直接開くと 403 画面になること、`/api/backend/statistics/resources` 相当の API 呼び出しが 403 になることを確認する
6. ブラウザの幅を狭めても棒グラフと表が崩れないことを目視で確認する
