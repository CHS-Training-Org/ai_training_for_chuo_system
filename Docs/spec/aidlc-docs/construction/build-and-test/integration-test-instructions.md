# Integration Test Instructions

対象: Issue #29 CSV 帳票出力（`csv-export`）。

## Purpose

Frontend（ダイアログ → Server Action → BFF）と Backend（Controller → Service → Specification → DB）の連携が、CSV の生成・絞り込み・認可を含めて正しく動くことを確認する。

## 自動テストで担保している範囲

専用の結合テストスイート（別コマンド）は追加していない。次のテストが `./gradlew test` に含まれ、実 DB（H2）に対するクエリを実行する。

| テスト | 件数 | 内容 |
|---|---|---|
| `ReservationSpecificationsTest` | 7 | 期間（`from` を含み `to` を含まない）、期間をまたぐ予約の除外、ステータス（単一・複数）、AND、並び順（開始日時の昇順）、JOIN FETCH |
| `ReportControllerTest` | 20 | ロール別の認可（ADMIN 200 / MEMBER 403 / APPROVER 403 / 未認証 401）、応答ヘッダ、CSV の本文（BOM・ヘッダ・表記・エスケープ・0 件）、期間・ステータスの絞り込み、400（片方だけ・`from` ≧ `to`・オフセット付き） |

本番の PostgreSQL に対するテストは自動化していない。実 Postgres での確認は、下記の手動確認で行った。

## Setup Integration Test Environment（手動確認用）

### 1. Start Required Services

devcontainer では postgres / cognito-local / localstack が起動済み。停止している場合のみ:

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
```

初期データ（未投入の場合のみ。冒頭で全テーブルを `DELETE` するため、既存データがある場合は実行しない）:

```bash
docker exec -i ai_training_for_chuo_system_devcontainer-postgres-1 psql -U bookflow -d bookflow < scripts/seed.sql
```

Backend → Frontend の順に起動する:

```bash
cd backend && ./gradlew bootRun    # http://localhost:8080
cd frontend && pnpm dev            # http://localhost:3000
```

### 2. Configure Service Endpoints

追加の設定は不要。環境変数は `docker-compose.yml`（`DB_URL` など）と `frontend/.env.local` で設定済み。ブラウザのサインインは動作しないため、サインイン画面の開発専用ロール別ログインボタンを使う。

## Test Scenarios（手動確認）

ユーザーが 2026-10-24 に実施。データは `seed.sql` 投入済みの既存データ（予約 2 件: 2026-06-02 10:00 の `APPROVED`、2026-06-03 14:00 の `PENDING`）。DB の変更・追加データの投入はしていない。

### Scenario 1: ADMIN で CSV をダウンロードする

- **Test Steps**: ADMIN でログインして `/reservations` を開き、「CSV ダウンロード」ボタンからダイアログを開く。
- **Expected Results / Result（すべて期待どおり）**:
  - ボタンが「リソースを探す」の左側に表示され、既存画面に崩れがない。
  - ダイアログに開始日時、終了日時、ステータス 4 種、キャンセル、ダウンロードが表示される。
  - 条件なしでダウンロードに成功する。ファイル名は `reservations_20261024.csv`。UTF-8 BOM、日本語 7 列ヘッダ、2 件、開始日時昇順、`yyyy/MM/dd HH:mm`、ステータスの日本語表記。

### Scenario 2: 絞り込み

- 「承認済み」のみを指定すると、承認済み 1 件だけの CSV になる。
- `2026/06/03 00:00`〜`2026/06/04 00:00` を指定すると、6/3 の承認待ち予約 1 件だけの CSV になる。

### Scenario 3: 異常系

- 開始日時のみを指定して終了日時を空欄にすると、CSV はダウンロードされず、トースト「CSV のダウンロードに失敗しました。」が表示され、ダイアログは開いたままになる。

### Scenario 4: ADMIN 以外

- MEMBER（田中 花子）、APPROVER（鈴木 一郎）で `/reservations` を開くと、「CSV ダウンロード」ボタンは表示されず、既存の画面は正常に表示される。

## 手動確認していない範囲

- 複数ステータスの選択、期間境界の細部、カンマ・ダブルクォートを含む目的のエスケープ: 自動テスト（`ReportControllerTest` など）で確認済み。実画面では未確認。
- ダウンロードした CSV を Excel で開いたときの表示（文字化け・列ずれ）: 未確認。

## Cleanup

確認用に起動した Backend・Frontend は停止する。DB のデータは変更していないため、後始末は不要。
