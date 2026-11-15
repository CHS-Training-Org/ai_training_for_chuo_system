#!/usr/bin/env bash
set -euo pipefail

echo "::: [1/6] git: dubious ownership 回避設定 :::"
# 作業ユーザーは node で、uid は devcontainer.json の updateRemoteUserUID によりホストの
# ユーザーに揃う（Issue #166）。そのため通常は /workspace の所有者と一致し、この設定は効かない。
# 揃わない環境（uid の更新が効かない Docker 構成など）では、git が
# "detected dubious ownership in repository at '/workspace'" を出して fetch/push を含む
# 全コマンドを拒否するため、保険として safe.directory に登録しておく。
# --add は再実行のたびに重複登録されるため、未登録の場合のみ追加して冪等にする。
git config --global --get-all safe.directory 2>/dev/null | grep -qx "/workspace" \
  || git config --global --add safe.directory /workspace

echo "::: [2/6] Claude Code: 自動更新できるよう所有者を作業ユーザーにする :::"
# claude-code feature はイメージのビルド時に root で npm install -g するため、
# パッケージのディレクトリが root 所有（root:nvm 2755）になり、node では自動更新が
# 権限エラーで失敗する（Issue #166）。パスワードなしの sudo（common-utils feature）で所有者を移す。
sudo chown -R "$(id -u)" "$(npm root -g)/@anthropic-ai"

echo "::: [3/6] frontend: pnpm install :::"
cd /workspace/frontend
pnpm install

echo "::: [4/6] Gradle: 使っていない daemon を 15 分で終わらせる :::"
# Gradle daemon は、VS Code の接続時に gradle-server（vscode-gradle 拡張）が起動し、ターミナルの
# ./gradlew もそれを使い回す。既定では何もしなくても 3 時間残り、約 510〜825MB を使い続ける（Issue #196、ADR-037）。
# コンテナの中のユーザー設定に書くので CI には効かない。次の gradlew dependencies が起動する daemon にも効くよう、先に書く。
# 再実行しても行が増えないよう、既存の設定を置き換える。
mkdir -p ~/.gradle
touch ~/.gradle/gradle.properties
sed -i '/^org\.gradle\.daemon\.idletimeout=/d' ~/.gradle/gradle.properties
# 末尾に改行がないと、追記する行が最後の行につながるため、先に改行を補う。
[ -s ~/.gradle/gradle.properties ] && [ -n "$(tail -c 1 ~/.gradle/gradle.properties)" ] && echo >> ~/.gradle/gradle.properties
echo "org.gradle.daemon.idletimeout=900000" >> ~/.gradle/gradle.properties

echo "::: [5/6] backend: gradle dependencies :::"
cd /workspace/backend
# 実行ビットは git に記録済み(100755)だが、clone 環境差で実行権限が落ちても動くよう
# sh 経由で起動する（保険）。Permission denied による postCreate 失敗を防ぐ。
sh ./gradlew dependencies -q

echo "::: [6/6] cognito-local: ユーザー provisioning :::"
# cognito-local にシードユーザーを登録する（冪等）。
# 取得した Pool ID / Client ID を frontend/.env.local に設定してください。
# （詳細は scripts/provision-cognito.sh を参照）
cd /workspace
bash scripts/provision-cognito.sh || echo "⚠ cognito-local provisioning スキップ（起動前または接続不可）"
