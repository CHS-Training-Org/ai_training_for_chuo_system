# Build Instructions — `reservation-draft`

**作成日時**: 2026-10-02

## 前提

| 項目 | 内容 |
|---|---|
| バックエンド | Java 25 / Gradle Wrapper（`backend/gradlew`） |
| フロントエンド | Node.js 24 / pnpm（`frontend/`） |
| ドキュメント | Node.js 24 / npm（`docs-next/`） |
| データベース | PostgreSQL 16（DevContainer の `postgres` サービス） |
| 認証 | cognito-local（DevContainer の `cognito-local` サービス） |

DevContainer では接続情報が環境変数として設定済みである（`.devcontainer/docker-compose.yml`）。
`DB_URL` が `jdbc:postgresql://postgres:5432/bookflow` を指す点に注意する。
サービスごとにネットワーク名前空間が分かれるため `localhost` では到達できない。

## ビルド手順

```bash
# 依存サービスの起動（起動済みなら不要）
docker compose -f .devcontainer/docker-compose.yml up -d

# バックエンド
cd backend && ./gradlew build

# フロントエンド
cd frontend && pnpm install --frozen-lockfile && pnpm build

# ドキュメント
cd docs-next && npm run build
```

## 本ユニットで追加された前提

なし。新しい依存関係、環境変数、マイグレーションはいずれも追加していない。
`DRAFT` は `V001__create_initial_schema.sql` の CHECK 制約に定義済みのため、データベースの再構築は不要である。

## よくある失敗

### `./gradlew build` が接続エラーで失敗する

`postgres` サービスが起動していない。`docker compose ... up -d` で起動する。
ユニットテストは H2 を使うため DB なしでも通るが、`bootRun` は PostgreSQL を要する。

### `pnpm build` が型エラーで失敗する

`pnpm test` は型検査を行わない。型の問題は `pnpm build` でのみ検出される。
`tests/` 配下は `pnpm build` の対象外であり、CI にも `tsc --noEmit` の独立したステップはない。
