#!/usr/bin/env bash
set -euo pipefail

echo "::: [1/3] frontend: pnpm install :::"
cd /workspace/frontend
pnpm install

echo "::: [2/3] backend: gradle dependencies :::"
cd /workspace/backend
# 実行ビットは git に記録済み(100755)だが、clone 環境差で実行権限が落ちても動くよう
# sh 経由で起動する（保険）。Permission denied による postCreate 失敗を防ぐ。
sh ./gradlew dependencies -q

echo "::: [3/3] cognito-local: ユーザー provisioning :::"
# cognito-local にシードユーザーを登録する（冪等）。
# 取得した Pool ID / Client ID を frontend/.env.local に設定してください。
# （詳細は scripts/provision-cognito.sh を参照）
cd /workspace
bash scripts/provision-cognito.sh || echo "⚠ cognito-local provisioning スキップ（起動前または接続不可）"
