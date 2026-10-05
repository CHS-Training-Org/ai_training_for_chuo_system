# Integration Test Instructions — resource-list-filter

## Purpose

`ResourceControllerTest`（MockMvc + H2）は結合テストとして自動実行されるが、H2 は PostgreSQL と方言が異なるため、本番相当の PostgreSQL に対する手動検証を別途行う。本タスクではこの手動検証で**実際に重大な不具合を発見・修正した**（下記「発見した問題」参照）。

## Test Scenarios

### Scenario 1: frontend → backend → PostgreSQL の疎通確認

- **Description**: `ResourceFilterForm` から送信される `keyword` パラメータが、実際の PostgreSQL 上で正しく動作するか
- **Setup**: `.devcontainer/docker-compose.yml` の `postgres`/`cognito-local` コンテナが起動済みであること
- **Test Steps**:
  1. `cd backend && DB_URL=jdbc:postgresql://postgres:5432/bookflow DB_USERNAME=bookflow DB_PASSWORD=bookflow COGNITO_JWKS_URI=http://cognito-local:9229/local_user_pool_id/.well-known/jwks.json ./gradlew bootRun`
  2. JWT 取得：`bash scripts/provision-cognito.sh --jwt hanako.tanaka@example.com`（事前に `bash scripts/provision-cognito.sh` でプロビジョニング済みであること）
  3. `curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/resources?keyword=<キーワード>"`
- **Expected Results**: `200 OK` で `keyword` に一致するリソースのみ返る
- **Cleanup**: `bootRun` プロセスを終了する

### Scenario 2: 大文字小文字非区別・ワイルドカードエスケープの実地確認

- **Test Steps**: `keyword=4k`（小文字）で `description` に `4K`（大文字）を含むリソースがヒットするか、`keyword=%` がリテラル扱いされ0件になるかを確認
- **Expected Results**: 両方とも期待どおり（下記「実測結果」参照）

## 実測結果（本タスクで実行済み）

| ケース | 結果 |
|---|---|
| `keyword` 未指定（回帰確認） | `200 OK`、全件返る |
| `keyword=会議室` | `200 OK`、「第1会議室」のみヒット |
| `keyword=プロジェクター` | `200 OK`、名称・説明の両方にヒットする2件を返す |
| `keyword=4k`（小文字、説明中の`4K`に一致） | `200 OK`、大文字小文字非区別で1件ヒット |
| `keyword=%` | `200 OK`、0件（リテラルエスケープが機能） |
| `keyword=会議室&category=EQUIPMENT` | `200 OK`、0件（AND条件が機能） |
| `keyword=`（空文字列） | `200 OK`、全件返る（条件解除） |
| `keyword` が101文字 | `400 VALIDATION_ERROR` |

## 発見した問題と修正（重要）

**症状**: `keyword` 未指定時（`GET /api/resources` をパラメータなしで呼ぶ最も基本的なケース）に、PostgreSQL 環境でのみ `500 Internal Server Error` が発生した。H2 を使う `ResourceControllerTest`・`ResourceServiceTest` はすべて pass していたため、自動テストでは検出できなかった。

**原因**: JPQL の `:keyword IS NULL OR LOWER(...) LIKE LOWER(CONCAT('%', :keyword, '%'))` というパターンで、`keyword` が `null` のとき、PostgreSQL の JDBC ドライバがバインド変数の型を正しく推論できず `function lower(bytea) does not exist` エラーを送出していた（H2 はこの型推論に寛容なため再現しない）。

**修正**: `ResourceRepository.search(...)` の JPQL で `CAST(:keyword AS string)` を明示することで、PostgreSQL に対してバインド変数の型を明確に伝え、解消した（修正後は H2・PostgreSQL 両方で全ケース pass を確認済み）。

**教訓**: 「結合テストは H2、本番は PostgreSQL」という環境差異（Requirements Analysis の確認質問で既に認識されていた論点）は、`LIKE`/`LOWER` の構文レベルだけでなく、**bind パラメータの型推論**という見えにくい層でも顕在化しうる。null 許容パラメータを含む JPQL を新規に書いた場合は、H2 だけでなく実際の PostgreSQL に対する手動確認を省略しないこと。
