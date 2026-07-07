---
type: guide
title: トラブルシューティング
description: 環境構築・起動・開発中によく発生するエラーの原因と対処法
tags:
  - guide
  - troubleshooting
  - debug
timestamp: 2026-06-12
audience: 学習者（主に新人）
references:
  - Docs/guide/getting-started.md
---

# トラブルシューティング

環境構築、開発中によくあるトラブルと解決策をまとめています。各項目は「症状 → 原因 → 解決策」の形式で記載します。

!!! tip "コマンドの「実行場所」に注意"
    本リポジトリではコマンドの実行場所が 3 つあります。**DevContainer 内**（VS Code の統合ターミナル。`pnpm` / `gradlew` / `claude` はここ）、**WSL2 ターミナル**（`~/.claude` などホスト側ファイルの操作）、**Windows 側**（PowerShell。`wsl --shutdown` 等）。  
    場所の取り違えが「コマンドが無い」「バージョンが違う」系トラブルの最大の原因です。各項目の解決策には実行場所を明記しています。  
    なお `docker` コマンドは DevContainer 内、WSL2 のどちらからでも同じ Docker デーモンに接続できます。

---

## DevContainer・Docker 関連 { #devcontainer }

### （Windows）「Reopen in Container」が docker.sock への接続エラーで失敗する

- **症状**: DevContainer 起動時に `failed to connect to the docker API at unix:///var/run/docker.sock ... no such file or directory` のようなエラーで失敗する。WSL2 ターミナルで `docker ps` を実行しても接続エラーになる。
- **原因**: Rancher Desktop（Docker エンジン）が起動していない、または開発に使う WSL ディストロ（Ubuntu）に対して **WSL 統合が有効化されていない**。既定では Docker デーモンは Rancher Desktop 専用ディストロ内でのみ動くため、統合を有効にしないと Ubuntu 内に `/var/run/docker.sock` が現れない。
- **解決策**:
    1. Windows 側で Rancher Desktop が起動していることを確認する
    2. トレイアイコン → **Preferences → WSL → Integrations** で **Ubuntu** を ON にして **Apply**（Docker Desktop の場合は **Settings → Resources → WSL Integration**）
    3. PowerShell で `wsl --shutdown` を実行してから Ubuntu を開き直す
    4. WSL2 ターミナルで `docker info` がエラーなく返れば OK。手順の詳細は [README「Windows ユーザー向け: WSL2 セットアップ」](https://github.com/CHS-Training-Org/ai_training_for_chuo_system/blob/main/README.md)を参照

### （Windows）Rancher Desktop の Container Engine 設定が原因で起動に失敗する

- **症状**: Rancher Desktop は起動しているのに、DevContainer のビルド・起動が失敗する。
- **原因**: Rancher Desktop の Container Engine が `containerd` に設定されている。本リポジトリは `dockerd (moby)` ランタイムを前提としている。
- **解決策**: Rancher Desktop の **Preferences → Container Engine** で **dockerd (moby)** を選択して **Apply** し、「Dev Containers: Rebuild Container」で起動し直す。

### （Windows）ファイル操作・ビルドが極端に遅い / ホットリロードが効かない

- **症状**: `pnpm install` や Gradle ビルドが異常に遅い。ファイルを保存しても HMR / Spring devtools が再読み込みしない。
- **原因**: リポジトリを Windows 側（`/mnt/c/...`）に置いている。WSL2 からのクロスファイルシステムアクセスが低速で、inotify のファイル変更イベントも正しく伝播しない。
- **解決策**: リポジトリを **WSL2 ネイティブ FS（`/home/<user>/...`）へ clone し直す**。WSL2 ターミナルで `pwd` が `/home/...` を返すことを確認してから VS Code を `code .` で開き、`Reopen in Container` する。詳細は [getting-started.md](./getting-started.md) の「OS 別の事前準備」を参照。

### （Windows）「Reopen in Container」時に Wayland ソケットのマウントエラーが出る

- **症状**: WSLg 有効環境で DevContainer 起動時に Wayland ソケット関連のマウントエラーで失敗する。
- **解決策**: VS Code のグローバル設定（`Preferences: Open User Settings (JSON)`）に以下を追加する。
  ```json
  "dev.containers.mountWaylandSocket": false
  ```

### 上記のいずれにも当てはまらず起動に失敗する

- **解決策**: コマンドパレット →「**Dev Containers: Show Container Log**」で失敗箇所のログを確認する。`.claude.json` 関連のマウントエラーであれば [§AI ツール関連](#ai-tools) を参照。原因を解消したら「**Dev Containers: Rebuild Container**」で再作成する（named volume は消えないため `node_modules` や DB データは保持される）。

!!! note "`docker ps -a` に `k8s_` で始まるコンテナが大量に表示される場合"
    Rancher Desktop の Kubernetes 機能が有効だと表示されますが、本プロジェクトとは無関係です。  
    使わない場合は **Preferences → Kubernetes** で無効化するとリソース消費を抑えられます。

---

## 依存インストール関連 { #install }

### `pnpm: command not found`／Node・Java のバージョンが想定と違う

- **症状**: `pnpm` や `java` が `command not found` になる。または `node -v` / `java -version` の結果がドキュメントの記載（Node 24 / Java 25）と異なる。
- **原因**: **DevContainer の外**（WSL2 やホストのターミナル）でコマンドを実行している。ツールチェーン（Node 24、pnpm 11、Java 25、Gradle 9.5）はすべて DevContainer 内にのみ導入されている。
- **解決策**: VS Code のウィンドウ左下が「**Dev Container: BookFlow Full Stack**」表示になっていることを確認し、VS Code の統合ターミナル（= コンテナ内）で実行する。確認コマンド（コンテナ内）：

  ```bash
  node -v         # v24.x
  pnpm -v         # 11.x
  java -version   # openjdk 25
  ```

### `pnpm install` が失敗する・`node_modules` が壊れた

- **症状**: `pnpm install` がエラーで止まる。または `pnpm dev` 起動時に `Cannot find module ...` のようなモジュール解決エラーが出る。
- **原因**: 一時的なネットワーク断・`postCreate.sh` の途中失敗・`node_modules` 内の不整合（`node_modules` は bind mount ではなく Docker named volume 上にある）など。
- **解決策**: コンテナ内で順に試す。
    1. `cd /workspace/frontend && pnpm install` を再実行する
    2. 改善しなければ `pnpm install --force`（pnpm ストアから全パッケージを再配置）
    3. それでも直らない場合は中身を空にして入れ直す：

        ```bash
        cd /workspace/frontend
        find node_modules -mindepth 1 -delete
        pnpm install
        ```

        `node_modules` ディレクトリ自体は named volume のマウントポイントのため削除できません（中身だけ消します）。

### `./gradlew` が `Permission denied` で実行できない

- **症状**: `cd backend && ./gradlew bootRun` が `Permission denied` になる。
- **原因**: チェックアウト状況によって `gradlew` の実行ビットが立っていないことがある。
- **解決策**: `sh ./gradlew bootRun` のように **`sh` 経由で実行する**（`postCreate.sh` も同じ方式）。

### Gradle の依存解決・ダウンロードが失敗する

- **症状**: `./gradlew` 実行時に `Could not resolve ...` やタイムアウトなど、依存・ディストリビューションのダウンロードで失敗する。
- **原因**: 一時的なネットワーク要因が大半（社内プロキシ環境では別途プロキシ設定が必要）。
- **解決策**: ネットワーク回復後にコンテナ内で `cd backend && sh ./gradlew dependencies` を再実行し、依存解決が通ることを確認してから `bootRun` する。

### `postCreate.sh` が途中で失敗した

- **症状**: DevContainer は起動したが、作成時ログにエラーがあり、pnpm install / Gradle 依存解決 / Cognito provisioning が完了していない。
- **解決策**: 失敗したステップ以降をコンテナ内で個別に再実行する（いずれも再実行可能）。

  ```bash
  cd /workspace/frontend && pnpm install
  cd /workspace/backend && sh ./gradlew dependencies
  cd /workspace && bash scripts/provision-cognito.sh
  ```

  provisioning が出力する Pool ID / Client ID の `.env.local` への設定は [getting-started.md](./getting-started.md) ステップ 3 を参照。

---

## 起動・接続エラー { #startup }

### ロール別ログイン後に `/auth/signin` へリダイレクトされ続ける

- **症状**: サインイン画面で MEMBER / APPROVER / ADMIN ボタンを押すと、ダッシュボードへ遷移できず再び `/auth/signin` に戻る。
- **原因**: 次のいずれかです。フロントエンドの認証レイアウトはユーザー情報取得の失敗を一律「未サインイン」として扱い `/auth/signin` へリダイレクトするため、症状だけでは区別できません。
    1. バックエンドが起動していないため、フロントエンドが `GET /api/users/me` を呼べない。
    2. バックエンドは起動しているが、初期データ（`scripts/seed.sql`）が投入されていない。バックエンドは Cognito トークンの `sub`（`users.cognito_sub`）でユーザーを検索するため、対応する行が無いと 401 を返す。この場合、ボタンを押した時点の Cognito 認証自体は成功している。
- **解決策**:
    - 原因 1（バックエンド未起動）の場合：VS Code の「Run and Debug」（++ctrl+shift+d++）→「**Backend**」で起動する。ターミナルから起動する場合は以下を実行する。

      ```bash
      cd backend && ./gradlew bootRun
      ```

      起動確認：

      ```bash
      curl http://localhost:8080/actuator/health
      # {"status":"UP"} が返れば OK
      ```

    - 原因 2（初期データ未投入）の場合：[getting-started.md](./getting-started.md) の「ステップ 5：初期データ投入・動作確認」を実行してから、再度サインインする。

### `pnpm dev` / `bootRun` がポート使用中エラーになる

- **症状**: `pnpm dev` 起動時に「`Port 3000 is in use`」のような警告が出て別ポート（3001 等）で起動してしまう。またはバックエンドが `Port 8080 was already in use` のようなエラーで停止する。
- **原因**: コンテナ内で同じサーバーを**二重起動**している（別のターミナルですでに起動中）。なお 3001 等の代替ポートはホストへ公開されておらず、認証設定（`BETTER_AUTH_URL`）も 3000 前提のため、3001 で起動したフロントエンドは正しく動きません。
- **解決策**: VS Code のターミナル一覧（パネル右側のリスト）を確認し、起動済みのプロセスを ++ctrl+c++ で停止してから起動し直す。ターミナルを閉じてしまいプロセスだけが残った場合は、コマンドパレット →「**Dev Containers: Rebuild Container**」でコンテナごと再起動するのが確実です。

### DevContainer 起動時に `port is already allocated` で失敗する

- **症状**: 起動時に `Bind for 0.0.0.0:5432 failed: port is already allocated` のようなエラーで失敗する。
- **原因**: 本プロジェクトはホスト側のポート **3000（frontend）/ 5432（postgres）/ 4566（localstack）/ 8000（docs）/ 9229（cognito-local）** を使用する。別プロジェクトのコンテナや、ホストに直接インストールしたサービス（ローカルの PostgreSQL 等）が同じポートを使っていると衝突する。
- **解決策**:
    1. WSL2（またはコンテナ内）で `docker ps` を実行し、同じポートを公開している別コンテナがあれば `docker stop <コンテナ名>` で停止する
    2. コンテナ以外のプロセスは Windows 側 PowerShell で特定する：

        ```powershell
        netstat -ano | findstr :5432
        tasklist /FI "PID eq <表示されたPID>"
        ```

### ロール別ログイン（開発用ログイン）がエラーになる

- **症状**: バックエンドは起動しているのに、サインイン画面のロール別ボタンでログインに失敗する。
- **原因**: cognito-local の User Pool、シードユーザーが provisioning されていない。または `.env.local` の `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` が現在の Pool と一致していない。認証はポート 9229 で動く cognito-local コンテナが担う（9229 は Node.js のデバッグポートではありません）。
- **解決策**: コンテナ内で provisioning を再実行し、出力された Pool ID / Client ID を `frontend/.env.local` に反映して `pnpm dev` を再起動する。
  ```bash
  cd /workspace && bash scripts/provision-cognito.sh
  ```

---

## DB・マイグレーション関連 { #database }

### バックエンド起動時に `Connection to postgres:5432 refused` になる

- **症状**: `bootRun` が DataSource / Flyway の初期化で失敗し、`Connection to postgres:5432 refused` を含むエラーが出る。
- **原因**: postgres コンテナが停止しているか、まだ起動完了（healthy）になっていない。
- **解決策**: 状態を確認し、停止していれば起動する（コンテナ内・WSL2 どちらでも可）。

  ```bash
  docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep postgres
  # Up ... (healthy) 以外の場合：
  docker start <postgres コンテナ名>
  ```

### Flyway の `Migration checksum mismatch` で起動に失敗する

- **症状**: `bootRun` が `Validate failed: ... Migration checksum mismatch for migration version 001` のようなエラーで停止する。
- **原因**: 適用済みのマイグレーションファイル（`backend/src/main/resources/db/migration/V001__create_initial_schema.sql` 等）を変更した。Flyway は適用時のチェックサムを DB に記録しており、ファイルが書き換わると検証エラーになる。**コミット済みマイグレーションファイルの変更は禁止**（[ADR-013](../decision/ADR-013-backend-db-migration.md) / [coding-conventions.md](./coding-conventions.md)）。
- **解決策**: `git restore` 等でマイグレーションファイルを変更前に戻す。スキーマを変更したい場合は新しいバージョンのファイル（`V002__<snake_case>.sql`）を追加する。学習用に DB ごと作り直して構わない場合は、次項のリセット手順でも解消できる。

### DB を初期状態に戻したい（リセット）

- **状況**: データを壊してしまった・チェックサムエラーを解消したい・まっさらな状態からやり直したい。
- **解決策**: スキーマごと削除すれば、次回のバックエンド起動時に Flyway がマイグレーションを再適用する。

  ```bash
  docker exec -i <postgres コンテナ名> psql -U bookflow -d bookflow \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  ```

  その後バックエンドを起動し直し、[getting-started.md](./getting-started.md) §初期データ投入の手順で seed を再投入する（postgres コンテナ名の確認方法と `docker exec -i` を使う理由も同節を参照）。

!!! warning "`docker compose down -v` は使わない"
    `-v` はすべての named volume を削除するため、DB データだけでなく `node_modules`、pnpm ストア、cognito-local のユーザーデータまで消えてしまいます。  
    リセットは上記の `DROP SCHEMA` 方式で DB だけを対象にしてください。

### `relation "..." does not exist` のような SQL エラーが出る

- **症状**: API アクセス時や起動時のスキーマ検証で `relation "reservations" does not exist` のようなエラーが出る。
- **原因**: マイグレーション未適用の DB に接続している（DB リセット後にバックエンドを再起動していない等）。
- **解決策**: バックエンドを再起動し、起動ログで Flyway の適用結果（`Successfully applied 1 migration` 等）を確認する。

---

## AI ツール関連 { #ai-tools }

### コンテナ起動が `.claude.json` 関連のマウントエラーで失敗する

- **症状**: 「Reopen in Container」が `.claude.json` のマウントに関するエラー（`... not a directory` 等）で失敗する。
- **原因**: ホスト（WSL2）側の `~/.claude.json` が**ディレクトリ**として存在している。マウント元が存在しない状態で Docker が自動生成すると空ディレクトリになり、ファイルを期待するコンテナ側と型が衝突する。通常は `devcontainer.json` の `initializeCommand` が空の JSON ファイル（`{}`）を事前生成するため発生しないが、一度ディレクトリ化すると以降の起動が失敗し続ける。
- **解決策**: WSL2 ターミナルで確認し、**ディレクトリだった場合のみ**削除してから DevContainer を起動し直す（`initializeCommand` がファイルとして再生成する）。

  ```bash
  ls -ld ~/.claude.json   # 先頭が d ならディレクトリ化している
  rm -rf ~/.claude.json   # ディレクトリだった場合のみ実行
  ```

  ファイルとして存在する `~/.claude.json` は Claude Code の認証、設定情報を含むため削除しないでください。

### `claude: command not found`

- **症状**: コンテナ内のターミナルで `claude` が見つからない。
- **原因**: Claude Code は devcontainer feature でインストールされるため、feature 追加前に作成された古いコンテナを使い続けていると入っていない。
- **解決策**: コマンドパレット →「**Dev Containers: Rebuild Container**」でコンテナを作り直す。

### コンテナを再作成するたびにログインを求められる／設定が消える

- **症状**: コンテナの再作成後に `claude` の再ログインが必要になる。会話履歴や設定が引き継がれない。
- **原因**: ホストの `~/.claude` / `~/.claude.json` のバインドマウントが効いておらず、認証情報がコンテナ内にしか保存されていない。
- **解決策**: コンテナ内で `ls /root/.claude` を実行し、ホスト側（WSL2 の `~/.claude`）と同じ内容が見えるか確認する。見えない場合は `.devcontainer/docker-compose.yml` のマウント定義（`${USERPROFILE:-$HOME}/.claude`）がホスト側の実パスに解決されているかを確認する（WSL2 から起動していれば `$HOME` = `/home/<user>` が使われる）。セットアップ全体は [ai-tools-guide.md §セットアップ](./ai-tools-guide.md#setup) を参照。
