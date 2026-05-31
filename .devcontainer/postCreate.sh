#!/usr/bin/env bash
set -euo pipefail

echo "::: [1/2] frontend: pnpm install :::"
cd /workspace/frontend
pnpm install

echo "::: [2/2] backend: gradle dependencies :::"
cd /workspace/backend
# 実行ビットは git に記録済み(100755)だが、clone 環境差で実行権限が落ちても動くよう
# sh 経由で起動する（保険）。Permission denied による postCreate 失敗を防ぐ。
sh ./gradlew dependencies -q
