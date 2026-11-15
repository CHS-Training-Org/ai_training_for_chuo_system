#!/usr/bin/env sh
# Rancher Desktop / WSL2 の bind mount 残骸を掃除する。
#
# 【問題】
# Rancher Desktop（WSL2 バックエンド）は bind mount を
#   /mnt/wsl/rancher-desktop/run/docker-mounts/<uuid>
# という proxy ディレクトリ経由でコンテナに渡す。バックエンドが異常終了
# （VS Code を閉じて WSL がシャットダウン・Rancher 再起動・スリープ等）すると、
# この proxy ディレクトリが残骸として残る。残骸には「named volume のマウントポイント」
# だった空のスタブディレクトリ（例: .venv / node_modules）が入っており、次回の
# `docker compose up` で munger の rmdir が「directory not empty」で失敗して
# devcontainer が起動できなくなる。残骸は root 所有のためホストの一般ユーザーからは
# sudo なしに削除できない。
#
# 【この掃除の安全性】
# docker-mounts は「定常稼働中は空」で、proxy ディレクトリは
#   (a) 残骸（クラッシュで残った・削除したい）か、
#   (b) 稼働中コンテナのアクティブな proxy（削除してはいけない）
# のいずれか。両者は「使い捨てコンテナから見て空か非空か」で確実に判別できる:
#   - アクティブ proxy はサブマウントであり、使い捨てコンテナの mount namespace には
#     伝播しないため *空* に見える → 保護される。
#   - 残骸は実体のある空スタブ（.venv 等）が残っているため *非空* に見える → 削除対象。
# そこで「非空の proxy ディレクトリのみ」を削除する。mtime での判別は使わない
# （アクティブ proxy は稼働時間が延びるほど古くなり、mtime では逆に消してしまうため）。
#
# 【空の残骸（Issue #192）】
# ファイルやソケット（VS Code が付ける Wayland ソケット、docker-outside-of-docker の
# /var/run/docker-host.sock）を bind mount している proxy は、*空のディレクトリ* として
# 残ることがある。止まっているコンテナを VS Code が `up --no-recreate` で起動し直すと、
# ファイルをマウントする先がディレクトリになっているため、runc が「not a directory」で
# 失敗する。空の残骸は上記の判別ではアクティブ proxy と区別できないので、別の方法で消す。
# docker inspect で「止まっているコンテナ」の bind mount の Source になっている proxy だけを
# 対象にし、rmdir で消す（rmdir は空のディレクトリしか消さず、マウント中なら失敗する）。
# 稼働中コンテナの proxy には触れない。消した proxy は、コンテナの起動時に Rancher Desktop が作り直す。
#
# 【適用範囲】
# Rancher Desktop / WSL2 専用。docker-mounts が無い環境（Docker Desktop 等）では no-op。
# docker 未起動・イメージ pull 失敗でも呼び出し側の `|| true` で起動を止めない。
#
# devcontainer.json の initializeCommand から呼ばれる（up の前・ホストのシェルで実行）。
# 手動復旧にも使える: リポジトリルートで `sh scripts/clean-devcontainer-mounts.sh`
set -eu

MOUNTS=/mnt/wsl/rancher-desktop/run/docker-mounts
[ -d "$MOUNTS" ] || exit 0

# 非空の proxy ディレクトリ（= 残骸）のみを使い捨て alpine コンテナ（内部 root）で削除。
docker run --rm -v "$MOUNTS":/m alpine sh -c '
  find /m -mindepth 1 -maxdepth 1 -type d | while read -r d; do
    if [ -n "$(find "$d" -mindepth 1 -print -quit 2>/dev/null)" ]; then
      echo "removing stale bind-mount residual: $d"
      rm -rf "$d"
    fi
  done
' 2>/dev/null || true

# 止まっているコンテナの proxy のうち、空のディレクトリになっている残骸を削除。
stopped_proxies=$(docker ps -aq --filter status=exited --filter status=created --filter status=dead \
  | xargs -r docker inspect --format '{{range .Mounts}}{{if eq .Type "bind"}}{{println .Source}}{{end}}{{end}}' 2>/dev/null \
  | sed -n "s#^$MOUNTS/##p" | sort -u || true)
if [ -n "$stopped_proxies" ]; then
  # shellcheck disable=SC2086 # uuid を 1 つずつ引数として渡すため、意図して分割する
  docker run --rm -v "$MOUNTS":/m alpine sh -c '
    for id in "$@"; do
      rmdir "/m/$id" 2>/dev/null && echo "removing empty bind-mount residual: /m/$id"
    done
    true
  ' sh $stopped_proxies 2>/dev/null || true
fi
