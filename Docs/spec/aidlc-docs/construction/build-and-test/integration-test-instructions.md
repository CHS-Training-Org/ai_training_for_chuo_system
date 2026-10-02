# Integration Test Instructions

## Purpose
`ResourceController` から `ResourceRepository` の JPQL までを、H2 上で実際に実行して確認する。

## Test Scenarios（`ResourceControllerTest`、今回追加 10 件）

### Scenario 1: キーワード一致
- 名称一致、説明のみ一致（大文字小文字違い）、`description` が null で名称一致、一致なしは 0 件
- 空白を含む語を分割しないこと、前後の空白が除去されること

### Scenario 2: 他の条件との AND
- カテゴリとの併用（一致しないカテゴリでは 0 件）
- `from`/`to` との併用（占有時は除外、隣接は含む）
- MEMBER は無効リソースを返さず、ADMIN は返す
- 空白のみのキーワードは条件なし

## Run Integration Tests
```bash
cd backend && ./gradlew test --tests "*ResourceControllerTest"
```
- **Expected Results**: 31 件すべて pass（既存 21 件、追加 10 件）
- **Cleanup**: テストが `@AfterEach` でデータを削除する（インメモリ H2 のため環境の後始末は不要）

## PostgreSQL での確認（未実施）
テストは H2 で、本番は PostgreSQL。今回の環境では PostgreSQL に接続できず確認できなかった。手動で確認する場合：
```bash
docker compose -f .devcontainer/docker-compose.yml up -d
cd backend && ./gradlew bootRun
# 別ターミナルで dev ログイン後の JWT を使い、keyword を付けて GET /api/resources を呼ぶ
```
- 確認するケース：`keyword` のみ、`keyword` と `category`、`keyword` と `from`/`to`、`keyword` 未指定
