# はじめに（環境構築・起動手順）

> 対象読者：学習者（主に新人）
> 参照：[troubleshooting.md](./troubleshooting.md) / [ai-tools-guide.md](./ai-tools-guide.md)

このガイドは STEP-01「環境構築」の手順書として機能します。DevContainer を使って BookFlow のローカル開発環境を構築し、動作確認するまでの全手順を記載しています。

---

## 前提ソフトウェア

| ソフトウェア | 用途 | 備考 |
|------------|------|------|
| VS Code | エディタ | `Dev Containers` 拡張が必須。Windows では `WSL` 拡張も必須 |
| Dev Containers 拡張 | コンテナ開発 | `ms-vscode-remote.remote-containers` |
| Docker Engine | コンテナ実行 | Rancher Desktop（`dockerd (moby)` ランタイム）または Docker Desktop（RAM 8GB 以上割当） |

### OS 別の注意事項（Windows: WSL2 を使う）

Windows で開発する場合は **WSL2（Ubuntu 等の Linux）上にリポジトリを配置**してください。
Windows 側（`C:\...` / WSL2 からは `/mnt/c/...`）にソースを置くと、クロスファイルシステムアクセスにより
ファイル I/O が著しく遅くなり、ホットリロード（HMR / devtools）も効かなくなることがあります。

- **WSL2 / Ubuntu のインストール**（PowerShell を管理者で実行）:
  ```powershell
  wsl --install -d Ubuntu
  ```
- **VS Code 拡張**: `WSL`（`ms-vscode-remote.remote-wsl`）と `Dev Containers` を両方インストール。

#### WSL2 ターミナルの入り方

- **Windows Terminal** を起動し、タブのドロップダウンから「Ubuntu」を選択（推奨）
- スタートメニューで「Ubuntu」を検索して起動
- PowerShell / コマンドプロンプトで `wsl`（ディストリ指定は `wsl -d Ubuntu`）
- VS Code 統合ターミナルのドロップダウンで「Ubuntu (WSL)」を選択

> プロンプトが `user@host:~$` 形式で、`pwd` が `/home/<user>/...` を返せば WSL2 ネイティブ FS 上です。
> `/mnt/c/...` を返す場合は Windows 側なので、下記の「クローンから起動まで」に従い WSL2 側へ移動してください。

---

## 推奨ホストスペック

<!-- Batch 5 で記述：RAM・ストレージ等の推奨スペック。16GB RAM 以上推奨等 -->

---

## クローンから起動まで

> **Windows ユーザーは必ず WSL2（Ubuntu）のターミナル内で**以下を実行してください（上記「OS 別の注意事項」参照）。
> macOS / Linux ユーザーは通常のターミナルでそのまま実行できます。

```bash
# 1. WSL2 ネイティブ FS にクローン（Windows の場合は /home 配下に置くのが重要）
cd ~
mkdir -p projects && cd projects
git clone <repository-url> ai-development-tutorial
cd ai-development-tutorial

# 2. VS Code で開く（Windows では WSL リモートとして起動し、左下に「WSL: Ubuntu」と表示される）
code .

# 3. コマンドパレット（Ctrl+Shift+P）→ "Dev Containers: Reopen in Container"
#    → postgres / localstack / cognito-local / backend / docs コンテナが自動起動

# 4. DevContainer 内のターミナルでサービスを起動
cd frontend && pnpm dev          # http://localhost:3000
# 別ターミナルで
cd backend && ./gradlew bootRun  # http://localhost:8080
```

---

## 動作確認手順

<!-- Batch 5 で記述：確認 URL と期待するレスポンス。http://localhost:3000（フロントエンド）・http://localhost:8080/actuator/health（バックエンド）等 -->

---

## 初期データ投入

`scripts/seed.sql` には部署・ユーザー・リソース・サンプル予約・承認ステップの初期データが含まれています。DevContainer 起動・PostgreSQL サービス稼働後に一度だけ実行してください（再実行しても冪等です）。

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

> **docker compose exec を使う場合**：compose プロジェクト名が環境によって異なるため、`docker compose exec postgres psql ...` は「service is not running」と誤判定されることがあります。コンテナ名を直接指定する `docker exec -i` の方法を推奨します。

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

## よくあるトラブル

詳細は [troubleshooting.md](./troubleshooting.md) を参照してください。

<!-- Batch 5 で記述：頻出エラーへの簡易案内と troubleshooting.md の該当セクションへのリンク -->
