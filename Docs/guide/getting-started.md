---
type: guide
title: はじめに（環境構築・起動手順）
description: DevContainer を使った BookFlow の環境構築と初回起動手順
tags:
  - guide
  - getting-started
  - setup
timestamp: 2026-06-12
audience: 学習者（主に新人）
references:
  - Docs/guide/troubleshooting.md
  - Docs/guide/ai-tools-guide.md
---

# はじめに（環境構築・起動手順）

このガイドは STEP-01「環境構築」の手順書です。DevContainer を使って BookFlow のローカル開発環境を構築し、動作確認するまでの全手順を記載しています。

手順の全体像は次の 5 ステップです。

1. 前提ソフトウェアの準備（OS 別の事前準備を含む）
2. リポジトリのクローンと DevContainer 起動
3. フロントエンド環境変数の設定（初回のみ）
4. サービスの起動
5. 動作確認・初期データ投入

---

## 前提ソフトウェア

| ソフトウェア | 用途 | 備考 |
|------------|------|------|
| VS Code | エディタ | `Dev Containers` 拡張が必須。Windows では `WSL` 拡張も必須 |
| Dev Containers 拡張 | コンテナ開発 | `ms-vscode-remote.remote-containers` |
| Docker Engine | コンテナ実行 | Rancher Desktop（`dockerd (moby)` ランタイム）または Docker Desktop（RAM 8GB 以上割当） |

### 推奨ホストスペック

DevContainer では postgres / localstack / docs の各コンテナが開発コンテナと同時に起動します（cognito-local は既定では起動せず、ステップ 3 で必要な場合のみ手動起動します）。次のスペックを推奨します。

| 項目 | 推奨値 | 備考 |
|------|--------|------|
| RAM | 16GB 以上 | Docker への割当は 8GB 以上を確保する |
| CPU | 4 コア以上 | Gradle ビルドと Next.js dev サーバーが並走するため |
| ストレージ空き容量 | 20GB 以上 | コンテナイメージ・pnpm ストア・Gradle キャッシュを含む |

### OS 別の事前準備

=== "Windows（WSL2 必須）"

    Windows では **WSL2（Ubuntu 等の Linux）上にリポジトリを配置**してください。

    !!! warning "Windows 側（`C:\...`）にソースを置かない"
        Windows 側（WSL2 からは `/mnt/c/...`）にソースを置くと、クロスファイルシステムアクセスによりファイル I/O が著しく遅くなり、ホットリロード（HMR / devtools）も効かなくなることがあります。  
        必ず WSL2 ネイティブファイルシステム（`/home/<user>/...`）に配置してください。

    1. **WSL2 / Ubuntu のインストール**（PowerShell を管理者で実行）

        ```powershell
        wsl --install -d Ubuntu
        ```

    2. **VS Code 拡張のインストール**：`WSL`（`ms-vscode-remote.remote-wsl`）と `Dev Containers` を両方インストールします。

    3. **Docker Engine の WSL2 統合を有効化**（重要）：Rancher Desktop / Docker Desktop は既定では専用ディストロ内でのみ Docker デーモンが動きます。開発に使う `Ubuntu` ディストロに統合を有効化しないと `/var/run/docker.sock` が現れず、DevContainer 起動が失敗します。

        - **Rancher Desktop**: トレイアイコン → **Preferences → WSL → Integrations** → **`Ubuntu`** を **ON** → **Apply**
        - **Docker Desktop**: **Settings → Resources → WSL Integration** → **`Ubuntu`** を **ON** → **Apply & Restart**

        反映後、PowerShell で `wsl --shutdown` を実行してから Ubuntu を開き直してください。確認：Ubuntu ターミナルで `docker ps` が権限エラーなく通れば OK です。

    4. **WSL2 ターミナルに入る**（いずれかの方法）

        - **Windows Terminal** を起動し、タブのドロップダウンから「Ubuntu」を選択（推奨）
        - スタートメニューで「Ubuntu」を検索して起動
        - PowerShell / コマンドプロンプトで `wsl`（ディストリ指定は `wsl -d Ubuntu`）
        - VS Code 統合ターミナルのドロップダウンで「Ubuntu (WSL)」を選択

    !!! tip "WSL2 ネイティブ FS 上にいるかの確認"
        プロンプトが `user@host:~$` 形式で、`pwd` が `/home/<user>/...` を返せば WSL2 ネイティブ FS 上です。  
        `/mnt/c/...` を返す場合は Windows 側なので、`cd ~` で WSL2 側へ移動してから次のステップに進んでください。

=== "macOS"

    追加の事前準備は不要です。Docker Desktop または Rancher Desktop をインストールし、通常のターミナルでそのまま「ステップ 1」から実行できます。

=== "Linux"

    追加の事前準備は不要です。Docker Engine をインストールし、通常のターミナルでそのまま「ステップ 1」から実行できます。

---

## ステップ 1：リポジトリのクローン

!!! note "Windows ユーザーへ"
    必ず **WSL2（Ubuntu）のターミナル内で**実行してください（上記「OS 別の事前準備」参照）。

```bash
cd ~
mkdir -p projects && cd projects
git clone <repository-url> ai_training_for_chuo_system
cd ai_training_for_chuo_system
```

## ステップ 2：VS Code で開き DevContainer を起動

```bash
code .
```

Windows では WSL リモートとして起動し、ウィンドウ左下に「WSL: Ubuntu」と表示されることを確認してください。

続いて、コマンドパレット（++ctrl+shift+p++）→ **"Dev Containers: Reopen in Container"** を実行します。

- postgres / localstack / docs の各コンテナが自動起動します（バックエンドはコンテナとしては起動せず、ステップ 4 で開発コンテナ内から手動起動します）
- cognito-local は既定では起動しません。ロール別ログイン（開発用ログイン）と、フロントエンドの Cognito 関連環境変数の発行に必要なため、ステップ 3 で手動起動します

## ステップ 3：フロントエンド環境変数の設定（初回のみ）

DevContainer 内のターミナルで実行します。まず cognito-local を起動し、Pool ID / Client ID を発行します。

```bash
docker compose -f .devcontainer/docker-compose.yml --profile cognito up -d cognito-local
bash scripts/provision-cognito.sh
```

出力された `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` の値を控えておきます。

続いて `.env.local` を作成します。

```bash
cd frontend
cp .env.local.example .env.local
```

`.env.local` の以下の項目に、上記で控えた値を設定します。

```dotenv
COGNITO_USER_POOL_ID=local_XXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

!!! warning "この設定を省略すると 500 エラーになる"
    `.env.local` の作成と Cognito 環境変数の設定を行わないと、フロントエンドにアクセスした際に、  
    Better Auth の初期化エラー（`[BetterAuthError]: DOMAIN_AND_REGION_REQUIRED`）が発生し、`/` が 500 エラーになります。

!!! tip "Pool ID / Client ID を見逃した場合"
    出力を見逃した場合は、手動で再実行できます。

    ```bash
    bash scripts/provision-cognito.sh
    ```

## ステップ 4：サービスの起動

VS Code の「Run and Debug」（++ctrl+shift+d++）からフロントエンドとバックエンドをそれぞれ起動します。

1. サイドバーの「Run and Debug」アイコンをクリック（またはショートカット ++ctrl+shift+d++）
2. ドロップダウンで「**Frontend**」を選択し、▶ で起動（http://localhost:3000）
3. ドロップダウンで「**Backend**」を選択し、▶ で起動（http://localhost:8080）

「Backend」はネイティブ Java デバッグが有効なため、ブレークポイントをそのまま利用できます。

!!! tip "ターミナルから起動する場合"
    VS Code の Run and Debug を使わない場合は、ターミナルから直接起動できます。

    ```bash
    # ターミナル 1：フロントエンド（http://localhost:3000）
    cd frontend && pnpm dev
    ```

    ```bash
    # ターミナル 2：バックエンド（http://localhost:8080）
    cd backend && ./gradlew bootRun
    ```

!!! warning "バックエンド未起動のままアクセスしない"
    バックエンドを起動せずにフロントエンドにアクセスすると、認証後に `/auth/signin` へリダイレクトされ続けます。  
    先に下記「動作確認」でバックエンドの起動を確認してください。

## ステップ 5：動作確認

すべて起動できたら、以下を確認します。

| 確認対象 | URL / コマンド | 期待する結果 |
|---------|----------------|--------------|
| バックエンド | `curl http://localhost:8080/actuator/health` | `{"status":"UP"}` が返る |
| フロントエンド | <http://localhost:3000> | サインイン画面またはダッシュボードが表示される |
| ドキュメントサイト | <http://localhost:8000> | 本ドキュメントサイトが表示される（docs コンテナが自動起動） |

フロントエンドからサインインして画面が表示されれば、環境構築は完了です。続けて下記の「初期データ投入」を行うと、画面にサンプルデータが表示されるようになります。

---

## 初期データ投入

`scripts/seed.sql` には部署、ユーザー、リソース、サンプル予約、承認ステップの初期データが含まれています。  
DevContainer 起動、PostgreSQL サービス稼働後に一度だけ実行してください（再実行しても冪等です）。

### 実行方法

`psql` クライアントは devcontainer（frontend コンテナ）にインストールされていないため、postgres コンテナに直接コマンドを渡します。

**ステップ 1：postgres コンテナ名を確認する**

```bash
docker ps --format "table {{.Names}}\t{{.Image}}" | grep postgres
```

表示例：`aidevelopmenttutorial_devcontainer-postgres-1`

**ステップ 2：seed を投入する**

```bash
# <postgres コンテナ名> を実際のコンテナ名に置き換える
docker exec -i <postgres コンテナ名> psql -U bookflow -d bookflow < scripts/seed.sql
```

実行例：

```bash
docker exec -i aidevelopmenttutorial_devcontainer-postgres-1 \
  psql -U bookflow -d bookflow < scripts/seed.sql
```

!!! note "docker compose exec を使う場合"
    compose プロジェクト名が環境によって異なるため、`docker compose exec postgres psql ...` は「service is not running」と誤判定されることがあります。  
    コンテナ名を直接指定する `docker exec -i` の方法を推奨します。

### 投入後の確認

以下のクエリでデータが入ったことを確認できます。

```bash
docker exec -i <postgres コンテナ名> psql -U bookflow -d bookflow \
  -c "SELECT name, category, requires_approval FROM resources ORDER BY category;"
```

期待する出力（3 件）：

```
       name        | category  | requires_approval
-------------------+-----------+------------------
 プロジェクターA    | EQUIPMENT | f
 第1会議室          | ROOM      | t
 社用車A            | VEHICLE   | f
(3 rows)
```

また、アプリを起動してブラウザで `http://localhost:3000/resources` にアクセスし、リソースが 3 件表示されることでも確認できます。

| 確認項目 | 期待値 |
|---------|--------|
| リソース | 3 件（ROOM・EQUIPMENT・VEHICLE 各 1 件） |
| 予約 | 2 件（APPROVED 1 件・PENDING 1 件） |
| 承認待ち（`/approvals`） | 1 件（第1会議室の申請） |

---

## 手動セットアップ（DevContainer なし） { #manual }

DevContainer を使わない場合の手順です。

### 前提条件

| ツール | バージョン |
|--------|-----------|
| Node.js | 24.x |
| pnpm | 11.x（下記手順でインストール） |
| Java | 25（Temurin 推奨） |
| Docker + Compose | 最新安定版 |

### 1. pnpm のインストール

```bash
# Node.js の Corepack 経由でインストール（推奨）
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. ローカルサービス（Docker）の起動

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
```

起動するサービス：

- `postgres:5432`：RDB（PostgreSQL 16）
- `localstack:4566`：AWS モック（S3 / DynamoDB）
- `docs:8000`：ドキュメントサイト

`cognito-local:9229`（Cognito モック）は既定では起動しません。ロール別ログイン（開発用ログイン）とフロントエンドの Cognito 関連環境変数の発行に必要なため、次の手順で個別に起動します。

### 3. Cognito のセットアップ（初回のみ）

```bash
docker compose -f .devcontainer/docker-compose.yml --profile cognito up -d cognito-local
bash scripts/provision-cognito.sh
```

出力された `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` の値を控えておきます。

### 4. フロントエンドのセットアップ

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
```

`.env.local` に手順 3 で出力された値を設定します。

```dotenv
COGNITO_USER_POOL_ID=local_XXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

フロントエンドを起動します。

```bash
pnpm dev   # http://localhost:3000
```

### 5. バックエンドのセットアップ

```bash
cd backend
./gradlew bootRun   # http://localhost:8080
```

---

## Claude Code の起動（Windows WSL2） { #claude-code-wsl2 }

Windows で Claude Code を使う場合、**Windows 側ではなく WSL2 の Linux 内で起動してください**。

Claude Code はホストの `bash` / `git` / 各種 CLI（`jq` など）を直接呼び出して動作します。  
Windows 側で起動するとファイルアクセスが 9p プロトコル経由になり低速になるほか、`bash` の解決先がずれてコマンドが失敗することがあります。

WSL2（Ubuntu）のターミナル内で実行します。

```bash
# 1. 依存ツール（jq）を導入
sudo apt-get update && sudo apt-get install -y jq

# 2. Claude Code をインストール（~/.local/bin に入る）
curl -fsSL https://claude.ai/install.sh | bash

# 3. ターミナルを開き直して PATH を反映（または source ~/.bashrc）

# 4. インストール確認
which claude      # → /home/<user>/.local/bin/claude なら成功
uname -s          # → Linux
jq --version      # → バージョンが出れば OK

# 5. リポジトリへ移動して起動
cd ~/projects/ai_training_for_chuo_system
claude
```

!!! tip "`which claude` が `/mnt/c/...` を指す場合"
    Windows 側の Node パスが PATH 上で優先されています。`~/.local/bin` を前に出してください。

    ```bash
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
    which claude   # 再確認
    ```

!!! note "DevContainer 内で使う場合"
    `.devcontainer/devcontainer.json` に Claude Code の feature が含まれているため、DevContainer 内のターミナルから起動すれば別途インストール不要です。

---

## よくあるトラブル

詰まったときは [troubleshooting.md](./troubleshooting.md) を参照してください。代表的な症状と参照先：

| 症状 | 参照先 |
|------|--------|
| DevContainer の起動が失敗する・極端に遅い | [troubleshooting.md §DevContainer・Docker 関連](./troubleshooting.md#devcontainer) |
| `pnpm install` / Gradle の依存解決が失敗する | [troubleshooting.md §依存インストール関連](./troubleshooting.md#install) |
| `pnpm dev` / `./gradlew bootRun` が起動しない・ポート競合 | [troubleshooting.md §起動・接続エラー](./troubleshooting.md#startup) |
| 認証後に `/auth/signin` へ戻され続ける | バックエンド未起動が原因（ステップ 4 の注意参照） |
| `[BetterAuthError]: DOMAIN_AND_REGION_REQUIRED` で 500 エラー | `.env.local` 未設定が原因（ステップ 3 参照） |
| DB 接続エラー・Flyway マイグレーション失敗 | [troubleshooting.md §DB・マイグレーション関連](./troubleshooting.md#database) |
| Claude Code が動かない・コンテナ起動が `.claude.json` で失敗する | [troubleshooting.md §AI ツール関連](./troubleshooting.md#ai-tools) |
