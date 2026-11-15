#!/usr/bin/env bash
# ドキュメントサイト（docs-next）の開発サーバーを、docs コンテナの中で起動する（運営者用。Issue #192）。
#
# docs コンテナはふだんビルド済みの静的ファイルを 8000 で配っている（開発サーバーは常に
# 0.7〜1GB を使うため。ADR-036）。編集をすぐ画面に反映したいときや、ページに直接コメントを
# 残したいとき（plugins/review-comments.js）だけ、開発サーバーを 8001 で起動する。
# 前面で動くので、使い終わったら Ctrl+C で止める。
#
# 使い方（作業用コンテナのターミナルで）: bash scripts/docs-dev.sh
#   → http://localhost:8001/ai_training_for_chuo_system/
set -euo pipefail

PORT=8001
URL="http://localhost:${PORT}/ai_training_for_chuo_system/"

# docs コンテナの探し方は scripts/build-docs.sh と同じ。
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

responds() {
  docker exec "${ids[0]}" node -e "fetch('http://localhost:$1/').then(() => process.exit(0), () => process.exit(1))" 2>/dev/null
}

# 起動中の docs コンテナは依存を入れ直している（npm ci）ため、開発サーバーを起動できない。
# 静的配信（8000）が応答するまで待ってもらう。
if ! responds 8000; then
  echo "docs コンテナは起動中です（依存のインストールとビルドに 1 分ほどかかります）。http://localhost:8000 が表示されるようになってから、もう一度実行してください。" >&2
  exit 1
fi

# すでに動いていれば起動しない（Docusaurus は使用中のポートだと別のポートで起動するかを対話で尋ねてくるため）。
if responds "${PORT}"; then
  echo "開発サーバーはすでに動いています: ${URL}"
  exit 0
fi

echo "開発サーバーを起動します: ${URL}（Ctrl+C で止まります）"
tty=()
[ -t 0 ] && tty=(-it)
exec docker exec "${tty[@]}" "${ids[0]}" npx docusaurus start --host 0.0.0.0 --port "${PORT}" --no-open
