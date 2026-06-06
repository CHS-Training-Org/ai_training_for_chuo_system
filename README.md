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
#    → postgres:5432 / localstack:4566 / cognito-local:9229 / backend コンテナが自動起動する
#    ※ backend コンテナは起動するが Spring Boot は自動起動しない（gradle ロック競合回避のため）。
#       DevContainer 内のターミナルで別途 `cd backend && ./gradlew bootRun` を実行すること。
#    DevContainer 内のターミナルで pnpm dev を実行すると frontend:3000 が起動する

# 3. cognito-local にシードユーザーを provisioning（postCreate.sh が自動実行）
#    出力される Pool ID / Client ID を frontend/.env.local に設定する:
#      COGNITO_USER_POOL_ID=local_XXXXXXXX
#      COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
#    ※ postCreate.sh が失敗した場合は手動で実行:
#      bash scripts/provision-cognito.sh

# 4. 動作確認（./gradlew bootRun および pnpm dev を実行済みであること）
open http://localhost:3000   # フロントエンド
open http://localhost:8080/actuator/health  # バックエンド（bootRun 起動後に確認）
```

DevContainer を使わずにローカルで動かす場合は [環境構築ガイド（手動）](#手動セットアップ) を参照。

---

## Windows ユーザー向け: WSL2 セットアップ（推奨）

Windows で開発する場合、**リポジトリは WSL2 の Linux ネイティブファイルシステム上に配置してください**。
Windows 側（`C:\...` / WSL2 からは `/mnt/c/...`）にソースを置くと、以下の理由で著しく不利になります。

| 観点 | Windows 側（`/mnt/c`）に置いた場合 | WSL2 側（`~/`）に置いた場合 |
|------|----------------------------------|----------------------------|
| ファイル I/O | 9p プロトコル経由のクロス FS アクセスで非常に低速（`node_modules`・Gradle ビルドで顕著） | Linux ネイティブ速度 |
| DevContainer マウント | Windows→WSL2→Docker と 2 段変換が挟まりさらに低速 | WSL2→Docker のみで高速 |
| ホットリロード | inotify イベントが飛ばず HMR / devtools が効かないことがある | 正常に動作 |
| パーミッション・改行 | 実行権限やシンボリックリンクで `postCreate.sh` 等が詰まりやすい | Linux 流で安定 |

### 0. 前提（初回のみ）

- **WSL2 と Ubuntu をインストール**（PowerShell を管理者で開いて実行）:
  ```powershell
  wsl --install -d Ubuntu
  ```
  インストール後、再起動して Ubuntu の初回ユーザー設定を済ませる。
- **VS Code 拡張**: `WSL`（`ms-vscode-remote.remote-wsl`）と `Dev Containers`（`ms-vscode-remote.remote-containers`）をインストール（どちらも Microsoft 製）。

### 1. WSL2 ターミナルの入り方

次のいずれかの方法で WSL2（Ubuntu）のシェルに入れます。

- **Windows Terminal**: 起動してタブのドロップダウン（`∨`）から「Ubuntu」を選択（最も推奨）。
- **スタートメニュー**: 「Ubuntu」を検索して起動。
- **PowerShell / コマンドプロンプトから**: `wsl` と入力。特定ディストリビューションを指定する場合は `wsl -d Ubuntu`。
- **VS Code から**: 統合ターミナルのドロップダウンで「Ubuntu (WSL)」プロファイルを選択。

> プロンプトが `user@host:~$`（Linux 形式）になっていれば WSL2 内です。
> `pwd` が `/home/<user>/...` を返せば WSL2 ネイティブ FS、`/mnt/c/...` を返していれば Windows 側なので移動してください。

### 2. WSL2 ネイティブ FS にクローンして VS Code で開く

```bash
# ── WSL2（Ubuntu）のターミナル内で実行 ──
cd ~
mkdir -p projects && cd projects
git clone <repository-url> ai-development-tutorial
cd ai-development-tutorial

# VS Code を WSL リモートとして起動（左下に「WSL: Ubuntu」と表示される）
code .
```

> Windows のエクスプローラーから WSL2 のファイルを見たい場合は `\\wsl$\Ubuntu\home\<user>\projects` でアクセスできます（ただし**開発中の常用は WSL2 ターミナル経由を推奨**）。

### 3. DevContainer を起動

VS Code が `WSL: Ubuntu` に接続された状態で、コマンドパレット（`Ctrl+Shift+P`）から
**`Dev Containers: Reopen in Container`** を実行します。これで WSL2 上のファイルを使ってコンテナが起動します。
以降の手順は上記 [クイックスタート](#クイックスタートdevcontainer) と同じです。

### 補足

- Git 操作は WSL2 内の git で行ってください（改行コード `core.autocrlf` 問題を避けられます）。
- すでに Windows 側にクローン済みの場合は、`/mnt/c` からコピーするより **WSL2 側へ clone し直す**方がトラブルが少ないです。
- WSLg 起因の Wayland ソケットマウントエラーが出る場合は、上記クイックスタートの注意書き（`dev.containers.mountWaylandSocket: false`）を参照。

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

```bash
# 全サービスを起動
docker compose -f .devcontainer/docker-compose.yml up -d
```

起動するサービス：
- `postgres:5432` — RDB（PostgreSQL 16）
- `localstack:4566` — AWS モック（S3 / DynamoDB）
- `cognito-local:9229` — Cognito モック
- `frontend:3000` — Next.js dev server（VS Code「実行とデバッグ」から起動）
- `backend:8080` — Spring Boot（VS Code「実行とデバッグ」から起動）

---

## Claude Code 通知設定

このリポジトリでは Claude Code のタスク完了時などに**ターミナルベル**で通知する設定をしている（`.claude/settings.local.json` の `preferredNotifChannel: "terminal_bell"`）。

DevContainer（VS Code 統合ターミナル）でベルを鳴らすために、`.vscode/settings.json` で `terminal.integrated.enableBell` を有効化している。

### 通知を無効にしたい場合

`.claude/settings.local.json` の値を `"notifications_disabled"` に変更する。

```json
{
  "preferredNotifChannel": "notifications_disabled"
}
```

または、ベルの音だけ止めたい場合は VS Code の設定で無効化する。

```json
// .vscode/settings.json
{
  "terminal.integrated.enableBell": false
}
```

---

## 学習の始め方

1. [`Docs/guide/getting-started.md`](Docs/guide/getting-started.md) を読む
2. GitHub Issues の `[Level: Beginner]` タグが付いた課題から着手する
3. [`CONTRIBUTING.md`](CONTRIBUTING.md) に従ってブランチを切り、PR を送る

---

## ドキュメントサイト

ドキュメントは **Zensical** で静的サイトとして公開しています。

- **公開サイト**: https://bizarress.github.io/AI-Development-Tutorial/
- **ローカルプレビュー**: devcontainer 起動時に自動で http://localhost:8000 が立ち上がります。
- **手動ビルド**（`site/` への静的出力が必要な場合）:
  ```bash
  docker compose exec docs uv run zensical build
  ```

---

## ドキュメント一覧

| ドキュメント | 内容 |
|------------|------|
| [`Docs/PROJECT_PLAN.md`](Docs/PROJECT_PLAN.md) | プロジェクト全体計画 |
| [`Docs/ARCHITECTURE.md`](Docs/ARCHITECTURE.md) | システムアーキテクチャ |
| [`Docs/plan/01_REPO_STRUCTURE.md`](Docs/plan/01_REPO_STRUCTURE.md) | リポジトリ構造設計 |
| [`Docs/plan/03_SAMPLE_SERVICE_DOMAIN.md`](Docs/plan/03_SAMPLE_SERVICE_DOMAIN.md) | BookFlow ドメイン設計 |
| [`Docs/decision/`](Docs/decision/) | ADR（アーキテクチャ決定記録） |
| [`Docs/spec/index.md`](Docs/spec/index.md) | 実装仕様（要件・画面・API・ER 図） |
| [`Docs/guide/index.md`](Docs/guide/index.md) | 学習者向けガイド（環境構築・AI ツール・規約・トラブル） |

---

## コントリビュート

[`CONTRIBUTING.md`](CONTRIBUTING.md) を参照。  
ブランチ命名規則：`feature/<issue番号>-<short-desc>`
