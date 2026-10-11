# Integration Test Instructions

対象: Issue #23 リソース一覧の検索・フィルタ追加（`resource-list-filter`）。

## Purpose

Frontend（フォーム → Server Action → API）と Backend（Controller → Service → Repository → DB）の連携が、キーワード検索を含めて正しく動くことを確認する。

## 自動テストで担保している範囲

専用の結合テストスイート（別コマンド）は今回追加していない。次のテストが `./gradlew test` に含まれており、実 DB（H2）に対するクエリを実行する。

| テスト | 内容 |
|---|---|
| `ResourceRepositoryTest`（13 件） | `lower()`、`LIKE ... ESCAPE`、`%` `_` `\` のリテラル扱い、NULL の `description` の扱い |
| `ResourceControllerTest`（新規 10 件） | `keyword` を含む一覧 API の挙動 |

本番の PostgreSQL では実測していない。

## Test Scenarios（手動確認）

ブラウザでの手動確認。ユーザーから「実施済み」の報告を受けており、結果は次のとおり。実施日時と環境（データ内容は第1会議室を含む全 3 件）の詳細は確認できていない。

### Scenario 1: 名称の部分一致

- **Setup**: `/resources` を表示する。
- **Test Steps**: キーワード「会議室」を入力して送信する。
- **Expected Results**: 名称の部分一致で第1会議室のみ表示される。
- **Result**: 期待どおり（ユーザー報告）。

### Scenario 2: 説明文の部分一致

- **Test Steps**: キーワード「ホワイトボード」を入力して送信する。
- **Expected Results**: 説明文の部分一致で第1会議室のみ表示される。
- **Result**: 期待どおり（ユーザー報告）。

### Scenario 3: キーワード解除

- **Test Steps**: キーワードを解除する。
- **Expected Results**: 全 3 件の表示に戻る。
- **Result**: 期待どおり（ユーザー報告）。

### Scenario 4: カテゴリとの AND 条件

- **Test Steps**: カテゴリ「備品」とキーワード「プロジェクター」を指定する。
- **Expected Results**: 1 件表示される。
- **Result**: 期待どおり（ユーザー報告）。

### Scenario 5: 期間指定との AND 条件

- **Test Steps**: 期間を指定し、キーワード「会議室」を指定する。
- **Expected Results**: AND 条件で第1会議室のみ表示される。
- **Result**: 期待どおり（ユーザー報告）。

## Setup Integration Test Environment

`CLAUDE.md` の記載による。

```bash
# ローカルサービス
docker compose -f .devcontainer/docker-compose.yml up -d
# Backend
cd backend && ./gradlew bootRun    # http://localhost:8080
# Frontend
cd frontend && pnpm dev            # http://localhost:3000
```

注意: ブラウザサインインはローカルでは動作しない（`CLAUDE.md`）。動作確認はサインイン画面の「開発専用ロール別ログインボタン」を使う。

## Run Integration Tests

- 自動: `cd backend && ./gradlew test`（上記の Repository・Controller テストを含む）。
- 手動: 上記シナリオ 1〜5 を画面で確認する。

## Cleanup

```bash
docker compose -f .devcontainer/docker-compose.yml down
```

Repository・Controller テストの投入行は、テスト側で自動削除する（専用の `@AfterEach`、および `@Transactional`）。
