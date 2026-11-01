#!/usr/bin/env bash
# ドキュメントサイト（docs-next）を、docs コンテナの中でビルドする（Issue #164）。
#
# 作業用コンテナ（frontend）には Docusaurus の依存が入っていない。依存は docs コンテナ専用の
# named volume（docs-node-modules）にあるため、ビルドは docs コンテナに任せる。
# 出力先は docs-next/build/（bind mount のため作業用コンテナとホストからも見える）。
# リンク・アンカーが壊れていると、Docusaurus の onBrokenLinks / onBrokenAnchors が 'throw' のため失敗する。
#
# 使い方（作業用コンテナのターミナルで）: bash scripts/build-docs.sh
set -euo pipefail

# compose のプロジェクト名は環境で変わるため、サービス名のラベルで docs コンテナを探す。
# devcontainer を2つ動かしていると docs も2つ見つかるので、このコンテナと同じプロジェクトのものを選ぶ
# （scripts/e2e-workflow/db.mjs の postgres の探し方と同じ）。
filters=(--filter label=com.docker.compose.service=docs)
project=$(docker inspect "$(hostname)" --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || true)
if [ -n "$project" ]; then
  filters+=(--filter "label=com.docker.compose.project=${project}")
fi

mapfile -t ids < <(docker ps -q "${filters[@]}")
if [ "${#ids[@]}" -eq 0 ]; then
  echo "docs コンテナが見つかりません。devcontainer のサービスが起動しているか確かめてください。" >&2
  exit 1
fi
if [ "${#ids[@]}" -gt 1 ]; then
  echo "docs コンテナが2つ以上見つかり、どれを使うか決められません。使わない devcontainer を止めてから、もう一度実行してください。" >&2
  exit 1
fi

exec docker exec "${ids[0]}" npm run build
