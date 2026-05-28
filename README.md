# AI Development Tutorial — BookFlow

社内 AI 駆動開発チュートリアル用リポジトリ。  
施設・備品予約システム **BookFlow** を題材に、Next.js + Spring Boot のフルスタック開発を体験する。

---

## クイックスタート（DevContainer）

> **前提**:
> - VS Code + Dev Containers 拡張がインストール済みであること
> - Docker Engine として **Rancher Desktop**（または Docker Desktop）がインストール済みであること
>   - Rancher Desktop 使用時は Container Runtime を **dockerd (moby)** に設定すること
>   - Docker Desktop 使用時は RAM を 8GB 以上割り当てること
> - **WSL2 環境の注意**: WSLg（WSL GUI）が有効な場合、DevContainer 起動時に Wayland ソケットのマウントエラーが発生することがある。  
>   VS Code のグローバル設定（`Preferences: Open User Settings (JSON)`）に以下を追加することで回避できる。
>   ```json
>   "dev.containers.mountWaylandSocket": false
>   ```

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd ai-development-tutorial

# 2. VS Code で開き DevContainer を起動
#    コマンドパレット > "Dev Containers: Reopen in Container"
#    → postgres:5432 / localstack:4566 / cognito-local:9229 / backend:8080 が自動起動する
#    DevContainer 内のターミナルで pnpm dev を実行すると frontend:3000 が起動する

# 3. 動作確認
open http://localhost:3000   # フロントエンド
open http://localhost:8080/actuator/health  # バックエンド
```

DevContainer を使わずにローカルで動かす場合は [環境構築ガイド（手動）](#手動セットアップ) を参照。

---

## 手動セットアップ

DevContainer を使わない場合の手順。

### 前提条件

| ツール | バージョン |
|--------|-----------|
| Node.js | 22.x |
| pnpm | 10.x（下記手順でインストール） |
| Java | 21（Temurin 推奨） |
| Docker + Compose | 最新安定版 |

### 1. pnpm のインストール

```bash
# Node.js の Corepack 経由でインストール（推奨）
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. フロントエンドのセットアップ

```bash
cd frontend
cp .env.local.example .env.local   # 環境変数ファイルをコピーして編集
pnpm install
pnpm dev                            # http://localhost:3000 で起動
```

### 3. バックエンドのセットアップ

```bash
cd backend
./gradlew dependencies -q          # 依存関係のダウンロード確認
./gradlew bootRun                  # http://localhost:8080 で起動
```

### 4. ローカルサービス（Docker）の起動

初回のみ `setup-local.sh` を実行して Cognito ユーザープールを初期化する。

```bash
# 初回のみ：Cognito ユーザープールの初期化
bash scripts/setup-local.sh

# 全サービスを起動（以降は毎回このコマンド）
docker compose -f .devcontainer/docker-compose.yml up -d
```

起動するサービス：
- `postgres:5432` — RDB（PostgreSQL 16）
- `localstack:4566` — AWS モック（S3 / DynamoDB）
- `cognito-local:9229` — Cognito モック
- `frontend:3000` — Next.js dev server（VS Code「実行とデバッグ」から起動）
- `backend:8080` — Spring Boot（VS Code「実行とデバッグ」から起動）

---

## 学習の始め方

1. [`Docs/guide/getting-started.md`](Docs/guide/getting-started.md) を読む
2. GitHub Issues の `[Level: Beginner]` タグが付いた課題から着手する
3. [`CONTRIBUTING.md`](CONTRIBUTING.md) に従ってブランチを切り、PR を送る

---

## ドキュメント一覧

| ドキュメント | 内容 |
|------------|------|
| [`Docs/PROJECT_PLAN.md`](Docs/PROJECT_PLAN.md) | プロジェクト全体計画 |
| [`Docs/ARCHITECTURE.md`](Docs/ARCHITECTURE.md) | システムアーキテクチャ |
| [`Docs/plan/01_REPO_STRUCTURE.md`](Docs/plan/01_REPO_STRUCTURE.md) | リポジトリ構造設計 |
| [`Docs/plan/03_SAMPLE_SERVICE_DOMAIN.md`](Docs/plan/03_SAMPLE_SERVICE_DOMAIN.md) | BookFlow ドメイン設計 |
| [`Docs/decision/`](Docs/decision/) | ADR（アーキテクチャ決定記録） |

---

## コントリビュート

[`CONTRIBUTING.md`](CONTRIBUTING.md) を参照。  
ブランチ命名規則：`feature/<issue番号>-<short-desc>`
