#!/usr/bin/env bash
set -euo pipefail

echo "::: [1/4] git: dubious ownership 回避設定 :::"
# コンテナ内プロセスは root（uid 0）で動くが、/workspace はホスト側 bind mount により
# ホストユーザー所有（node:node など）のまま見える。uid 不一致により git が
# "detected dubious ownership in repository at '/workspace'" を出し、
# fetch/push を含む全コマンドを拒否するため、safe.directory に登録して回避する。
# --add は再実行のたびに重複登録されるため、未登録の場合のみ追加して冪等にする。
git config --global --get-all safe.directory 2>/dev/null | grep -qx "/workspace" \
  || git config --global --add safe.directory /workspace

echo "::: [2/4] frontend: pnpm install :::"
cd /workspace/frontend
pnpm install

echo "::: [3/4] backend: gradle dependencies :::"
cd /workspace/backend
# 実行ビットは git に記録済み(100755)だが、clone 環境差で実行権限が落ちても動くよう
# sh 経由で起動する（保険）。Permission denied による postCreate 失敗を防ぐ。
sh ./gradlew dependencies -q

echo "::: [4/4] cognito-local: 案内 :::"
# cognito-local は既定では起動しないため、provisioning もここでは実行しない。
# ロール別ログイン・保護エンドポイントの JWT 検証を使う場合のみ、手動で起動してから
# scripts/provision-cognito.sh を実行する（Docs/guide/getting-started.md 参照）。
echo "cognito-local は既定では起動しません。必要な場合は Docs/guide/getting-started.md の「ステップ 3」を参照してください。"
