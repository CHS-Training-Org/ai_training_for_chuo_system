# Integration Test Instructions（csv-export）

## Purpose
FE（画面と Route Handler）、BE（API）、DB（PostgreSQL）を通して、予約 CSV の出力が期待どおり動くことを確認する。

自動テストの範囲は次のとおり。
- BE の結合テスト（`ReportControllerTest`、22 件）は H2 で JPA の `Specification` と JOIN FETCH を実行して確認済み。
- FE の Route Handler は、backend を MSW で差し替えて、本文（BOM を含むバイト列）とヘッダの中継、パラメータの選別、エラー時のリダイレクトを確認済み。
- FE から BE を通した結合、PostgreSQL 上の動作、ブラウザでの実際のダウンロード、Excel での表示は自動テストの範囲外で、下のシナリオを手動で確認する。

## 実施結果

2026-10-26 に、AI（Claude）が backend を再起動し、PostgreSQL のシードデータで `curl`、ブラウザは Playwright の開発用ログインで確認した。学習者が結果を共有した。各シナリオの表のうち、実施した項目を下に記す。

| Scenario | 状況 |
|---|---|
| Scenario 1（PostgreSQL 上の API） | 一部実施。実施した項目はすべて期待どおり。期間の境界、AND、不正なパラメータ、APPROVER の 403、Optional は未実施 |
| Scenario 2（画面とブラウザでのダウンロード） | 一部実施。実施した項目はすべて期待どおり。ステータスの複数選択、backend 停止時のエラー、`/api/reports/reservations/csv` の直接アクセスは未実施 |
| Scenario 3（Excel での表示） | 未実施 |

### Scenario 1: 実施した項目（すべて期待どおり）

| 手順 | 結果 |
|---|---|
| 1〜3（ADMIN で全件） | `200`、`Content-Type: text/csv;charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_20261026_060106.csv"`、先頭が BOM（`ef bb bf`）、ヘッダ行と 2 件（2026-06-02 の承認済み、2026-06-03 の承認待ちの昇順） |
| 7、8 相当（`status`） | `status=APPROVED` は 1 件、`status=PENDING&status=APPROVED` は 2 件 |
| 10（0 件の期間） | BOM とヘッダ行のみ |
| 11（`from` > `to`） | `from=2030-01-10&to=2030-01-01` で `400` `VALIDATION_ERROR` |
| 13（MEMBER） | `403` `FORBIDDEN` |
| 14（未認証） | `401` |

未実施: 4〜6（期間の境界。特に `to` の日を含むこと）、9（期間とステータスの AND）、12（不正な `from` / `status` / 日時）、13 の APPROVER、Optional（インジェクション対策と RFC 4180 の実データ確認）。

### Scenario 2: 実施した項目（すべて期待どおり）

| 手順 | 結果 |
|---|---|
| 1、2（ADMIN） | サイドナビに「帳票出力」があり、`/admin/reports` が開く |
| 3（条件なしでダウンロード） | 376 バイトの CSV がダウンロードされ、BOM あり。内容は Scenario 1 の全件と同じ |
| 6（`from` > `to`） | 送信されず、「開始日は終了日以前の日付を指定してください。」が表示される |
| 9（MEMBER のナビ） | 「帳票出力」が出ない |
| 10（MEMBER が `/admin/reports` を直接開く） | 403 画面 |

未実施: 4、5（期間やステータスを指定したダウンロード）、7、8（backend 停止時のエラーメッセージ）、11、12。

### Scenario 3: 未実施
Excel（または相当の表計算アプリ）での表示は未確認。

### 実施中の気づき（要件にない点。今回は修正しない）
- **ファイル名の日時がサーバー（コンテナ）の UTC になる**。JST 15:01 に取得して `_060106` になった。`ReportController` が `LocalDateTime.now()` でファイル名を作るため、サーバーのタイムゾーンに依存する。要件と api-spec にタイムゾーンの定めがなく（api-spec には「タイムゾーン変換は行わない」とある）、今回は修正せず PR の任意メモに記載する。

## Test Scenarios

### Scenario 1: PostgreSQL 上の API（`curl`）
- **Description**: H2 では確認済みの検索条件、並び順、JOIN FETCH が PostgreSQL でも期待どおり動き、権限と入力検証が効くことを確認する。
- **Setup**: backend を最新のコードで再起動する。シードデータ（`scripts/seed.sql`）の予約は 2 件（下表）。JWT を取得する。
  ```bash
  ADMIN_JWT=$(bash scripts/provision-cognito.sh --jwt taro.kanri@example.com)
  MEMBER_JWT=$(bash scripts/provision-cognito.sh --jwt hanako.tanaka@example.com)
  APPROVER_JWT=$(bash scripts/provision-cognito.sh --jwt ichiro.suzuki@example.com)
  BASE=http://localhost:8080/api/reports/reservations/csv
  ```

  | 予約 | 開始 | 終了 | リソース | 申請者 | 目的 | 状態 |
  |---|---|---|---|---|---|---|
  | ① | 2026-06-02 10:00:00 | 2026-06-02 12:00:00 | プロジェクターA | 田中 花子 | 部内勉強会 | 承認済み |
  | ② | 2026-06-03 14:00:00 | 2026-06-03 16:00:00 | 第1会議室 | 田中 花子 | 部署合同レビュー | 承認待ち |

- **Test Steps と Expected Results**:

  | # | 操作 | 期待する結果 |
  |---|---|---|
  | 1 | `curl -s -D - -o /tmp/all.csv -H "Authorization: Bearer $ADMIN_JWT" "$BASE"` | `200`、`Content-Type: text/csv;charset=UTF-8`、`Content-Disposition: attachment; filename="reservations_YYYYMMDD_HHmmss.csv"` |
  | 2 | `head -c 3 /tmp/all.csv \| xxd` | `ef bb bf`（BOM） |
  | 3 | `cat /tmp/all.csv` | 1 行目が `予約ID,リソース名,申請者名,開始日時,終了日時,目的,承認状態`。続けて ①、② の順（開始日時の昇順）。承認状態は「承認済み」「承認待ち」。日時は `2026-06-02 10:00:00` の形式。行末は CRLF（`file /tmp/all.csv` に `CRLF` と出る） |
  | 4 | `"$BASE?from=2026-06-03"` | ② だけ |
  | 5 | `"$BASE?to=2026-06-02"` | ① だけ（`to` の日に開始する ① が含まれ、翌日の ② は含まれない） |
  | 6 | `"$BASE?from=2026-06-02&to=2026-06-02"` | ① だけ |
  | 7 | `"$BASE?status=PENDING"` | ② だけ |
  | 8 | `"$BASE?status=APPROVED&status=PENDING"` | ①、② |
  | 9 | `"$BASE?status=PENDING&from=2026-06-02&to=2026-06-02"` | ヘッダ行だけ（期間とステータスの AND） |
  | 10 | `"$BASE?from=2099-01-01"` | ヘッダ行だけ（BOM 付き）で `200` |
  | 11 | `"$BASE?from=2026-06-30&to=2026-06-01"` | `400`、本文は JSON の `{"code":"VALIDATION_ERROR",...}`（CSV ではない） |
  | 12 | `"$BASE?from=abc"`、`"$BASE?status=UNKNOWN"`、`"$BASE?to=2026-06-30T00:00:00"` | いずれも `400` `VALIDATION_ERROR` |
  | 13 | `$MEMBER_JWT` と `$APPROVER_JWT` で `"$BASE"` | いずれも `403`、本文は JSON の `{"code":"FORBIDDEN",...}` |
  | 14 | JWT なしで `"$BASE"` | `401` `UNAUTHORIZED` |

- **Optional（CSV インジェクション対策と RFC 4180 を実データで確認）**: MEMBER で、式とカンマとダブルクォートを含む目的の予約を作る。
  ```bash
  curl -s -X POST -H "Authorization: Bearer $MEMBER_JWT" -H "Content-Type: application/json" \
    -d '{"resourceId":"30000000-0000-0000-0000-000000000002","startAt":"2037-01-10T10:00:00","endAt":"2037-01-10T11:00:00","purpose":"=1+1,\"x\"","attendeesCount":1}' \
    http://localhost:8080/api/reservations
  curl -s -H "Authorization: Bearer $ADMIN_JWT" "$BASE?from=2037-01-10&to=2037-01-10"
  ```
  期待: 目的の列が `"'=1+1,""x"""`（先頭に `'`、カンマとダブルクォートを含むので囲み、`"` は 2 つ重なる）。
- **Cleanup**: Optional で作った予約は、返ってきた `id` を使って DB から削除する（`DELETE FROM reservations WHERE id = '<id>'`。`プロジェクターA` は承認不要で `approval_steps` がないため、他の削除は不要）。

### Scenario 2: 画面とブラウザでのダウンロード（`/admin/reports`）
- **Description**: 画面からの条件入力、ダウンロード、エラー表示、権限を確認する。
- **Setup**: `docker compose -f .devcontainer/docker-compose.yml up -d`、backend と `pnpm dev` を起動する。サインイン画面の開発専用ロール別ログインボタンでログインする（ブラウザのサインインはローカルでは動かない）。
- **Test Steps と Expected Results**:

  | # | 操作 | 期待する結果 |
  |---|---|---|
  | 1 | 管理者（ADMIN）でログインし、サイドナビを見る | ADMIN 専用項目の末尾に「帳票出力」がある |
  | 2 | 「帳票出力」を開く | `/admin/reports`。開始日、終了日、ステータス 4 種（承認待ち / 承認済み / 却下 / キャンセル済み。ドラフトはない）、「CSV ダウンロード」ボタンがある |
  | 3 | 何も入力せずに「CSV ダウンロード」を押す | ページは遷移せず、`reservations_YYYYMMDD_HHmmss.csv` がダウンロードされる。中身は全件 |
  | 4 | 開始日 `2026-06-03` だけを入れて押す | ② だけの CSV |
  | 5 | ステータスを「承認済み」「承認待ち」の 2 つ選んで押す | ①、② の CSV（複数のステータスが渡る） |
  | 6 | 開始日を終了日より後にして押す | ダウンロードされず、フォーム上に「開始日は終了日以前の日付を指定してください。」と出る |
  | 7 | 6 の後に日付を直して押す | メッセージが消え、ダウンロードされる |
  | 8 | backend を停止して押す | `/admin/reports` に戻り、「CSV の出力に失敗しました。時間をおいて再度お試しください。」と出る。確認後に backend を再起動する |
  | 9 | 一般社員（MEMBER）でログインし、サイドナビを見る | 「帳票出力」がない |
  | 10 | MEMBER で `http://localhost:3000/admin/reports` を開く | 403 画面（「アクセス権限がありません」） |
  | 11 | MEMBER で `http://localhost:3000/api/reports/reservations/csv` を直接開く | CSV はダウンロードされず、最終的に `/admin/reports` の 403 画面になる（backend が 403 を返し、Route Handler が `/admin/reports?error=FORBIDDEN` へ戻し、共通のガードが 403 画面を出す） |
  | 12 | サインアウトした（または開発用ログインの cookie が切れた）状態で `/api/reports/reservations/csv` を開く | サインイン画面に移る |

- **Cleanup**: なし

### Scenario 3: Excel（または相当の表計算アプリ）での表示
- **Description**: BOM 付き UTF-8 の CSV が、日本語環境の Excel で文字化けしないことを確認する（受入条件）。
- **Setup**: Scenario 2 の 3 でダウンロードした CSV を使う。
- **Test Steps**: ダブルクリックなどで Excel で開く。
- **Expected Results**: ヘッダ行と、リソース名、申請者名、目的の日本語が文字化けしない。日時が `2026-06-02 10:00:00` の形で表示される。Optional で作った式の目的は、先頭に `'` が付いた文字列として表示され、式として計算されない（`'` が見えるのは仕様どおりで、値が元の値と変わる点が API 仕様に書いてある）。
- **Cleanup**: なし

## Setup Integration Test Environment

### 1. Start Required Services
```bash
docker compose -f .devcontainer/docker-compose.yml up -d
cd backend && ./gradlew bootRun       # ログは /tmp/backend.log などへ
cd frontend && pnpm dev
```

### 2. Configure Service Endpoints
- BE は `http://localhost:8080`、FE は `http://localhost:3000`。FE の接続先は `frontend/.env.local`（`BACKEND_URL`）。

## Run Integration Tests

### 1. Execute Integration Test Suite
```bash
cd backend && ./gradlew test --tests "*ReportControllerTest"    # H2 での自動結合テスト
cd frontend && pnpm test csv-route                               # Route Handler（MSW）
```

### 2. Verify Service Interactions
- **Test Scenarios**: 上の Scenario 1〜3（手動）
- **Expected Results**: 上記のとおり
- **Logs Location**: BE のログ（`bootRun` の出力先）

### 3. Cleanup
```bash
docker compose -f .devcontainer/docker-compose.yml down    # 不要になったとき
```
