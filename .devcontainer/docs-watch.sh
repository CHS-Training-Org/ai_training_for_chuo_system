#!/bin/sh
# ============================================================================
# docs サービス起動スクリプト（zensical serve + ポーリング再ビルド）
# ----------------------------------------------------------------------------
# このリポジトリは Windows の C:\ を 9p(drvfs) 経由でマウントしているため、
# inotify ファイルイベントがコンテナへ伝播せず、zensical serve の自動再ビルド
# （inotify ベース）が機能しない。
# 代替として mtime ポーリングで変更を検知し、zensical build を回す。
# 注意: livereload も inotify 依存のため効かない。変更後はブラウザを手動更新（F5）すること。
# 9p をやめて WSL2 ネイティブ FS に資材を置けば、本スクリプトは不要になる。
# ============================================================================
set -e
cd /workspace

uv venv --allow-existing
uv sync

# 監視対象（ドキュメント本体 + サイト設定）の mtime シグネチャを2秒間隔で比較し、
# 変化があれば再ビルドする。初回ループはベースライン記録のみでビルドはしない
# （serve 起動時の初回ビルドと二重にならないようにするため）。
poll_rebuild() {
  last=""
  while true; do
    sig=$(find Docs zensical.toml -type f -printf '%T@ %p\n' 2>/dev/null | sort | md5sum)
    if [ "$sig" != "$last" ]; then
      if [ -n "$last" ]; then
        echo "[docs-watch] change detected -> rebuilding..."
        uv run zensical build || echo "[docs-watch] build failed (continuing)"
      fi
      last="$sig"
    fi
    sleep 2
  done
}
poll_rebuild &

# serve をフォアグラウンドで実行（初回ビルド + HTTP 配信を担う）
exec uv run zensical serve -a 0.0.0.0:8000
