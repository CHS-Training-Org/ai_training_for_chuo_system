# Integration Test Instructions

## Purpose
FE（画面と Server Action）、BE（API）、DB（PostgreSQL）を通して `keyword` が正しく動くことを確認する。

自動テストの範囲は次のとおり。
- BE の結合テスト（`ResourceControllerTest`）は H2 で JPQL を実行して確認済み。
- FE から BE を通した結合と、PostgreSQL 上の動作は自動テストの範囲外で、下のシナリオを手動で確認する（学習者が別途実施する）。

## 実施結果

### Scenario 1（PostgreSQL 上の JPQL）: 2026-10-26 学習者が実施。すべて期待どおり
backend を変更後のコードで再起動し、MEMBER の JWT とシードデータで `curl` した結果:

| 条件 | 結果 |
|---|---|
| `keyword` なし | 第1会議室、プロジェクターA、社用車A（全件） |
| `keyword=プロジェクター` | 第1会議室（説明に一致）、プロジェクターA |
| `keyword=4k` | プロジェクターA（大文字・小文字を区別しない） |
| `keyword=%` | 0 件（全件にならない） |
| `keyword=_` | 0 件 |
| `keyword=`（空白 2 つ） | 全件（条件なし） |
| `keyword=プロジェクター&category=ROOM` | 第1会議室（AND） |

### Scenario 2（画面）: 未実施（結果の記録待ち）

## Test Scenarios

### Scenario 1: PostgreSQL 上の JPQL（`LIKE ... ESCAPE '!'`、`LOWER(description)`）
- **Description**: H2 では確認済みの JPQL が PostgreSQL（`description` は `TEXT`）でも動くことを確認する。
- **Setup**: backend を変更後のコードで再起動する。`bash scripts/provision-cognito.sh --jwt hanako.tanaka@example.com` で JWT を取得して `JWT` に入れる。
- **Test Steps**:
  1. `curl -s -H "Authorization: Bearer $JWT" "http://localhost:8080/api/resources?keyword=%E4%BC%9A%E8%AD%B0"`（名称に一致する語）
  2. 説明文だけに含まれる語で検索する（大文字・小文字を変えても一致する）
  3. `keyword=%25`（`%` だけ）と `keyword=_` で検索する
  4. `keyword=` を空にする、または空白だけにする
  5. `keyword` と `category`、`from`/`to` を併用する
- **Expected Results**: 1・2 は一致するリソースのみ。3 は全件にならず、`%` や `_` を名称または説明に含むものだけ（なければ 0 件）。4 は `keyword` なしと同じ件数。5 は AND で絞られる。いずれも 200 で、500 にならない。
- **Cleanup**: なし

### Scenario 2: 画面（`/resources`）
- **Description**: キーワード入力から一覧の絞り込みまでを画面で確認する。
- **Setup**: `docker compose -f .devcontainer/docker-compose.yml up -d`、backend と `pnpm dev` を起動し、サインイン画面の開発専用ロール別ログインボタンでログインする（ブラウザのサインインはローカルでは動かない）。
- **Test Steps**:
  1. キーワードを入力して「絞り込む」を押す
  2. URL に `keyword` が付き、一覧が絞られ、入力欄に値が残ることを確認する
  3. カテゴリまたは期間を併用する
  4. 結果が複数ページになる条件でページ送りを押し、`keyword` が引き継がれることを確認する
  5. キーワードを空にして「絞り込む」を押す
  6. 「リセット」を押し、入力欄の表示が消えるかを確認する
- **Expected Results**: 受入条件 1〜4 を満たす。6 は未確認の点で、入力欄が消えない場合は既存のカテゴリ・期間と同じ挙動かを合わせて判断する。
- **Cleanup**: なし

## Setup Integration Test Environment

### 1. Start Required Services
```bash
docker compose -f .devcontainer/docker-compose.yml up -d
cd backend && ./gradlew bootRun       # ログは /tmp/backend.log などへ
cd frontend && pnpm dev
```

### 2. Configure Service Endpoints
- BE は `http://localhost:8080`、FE は `http://localhost:3000`。FE の接続先は `frontend/.env.local`。

## Run Integration Tests

### 1. Execute Integration Test Suite
```bash
cd backend && ./gradlew test --tests "*ResourceControllerTest"    # H2 での自動結合テスト
```

### 2. Verify Service Interactions
- **Test Scenarios**: 上の Scenario 1 と 2（手動）
- **Expected Results**: 上記のとおり
- **Logs Location**: BE のログ（`bootRun` の出力先）

### 3. Cleanup
```bash
docker compose -f .devcontainer/docker-compose.yml down    # 不要になったとき
```
