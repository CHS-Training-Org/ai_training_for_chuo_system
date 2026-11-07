# draw.io 閲覧用 JS（同梱）

ドキュメントサイトの draw.io の図（`static/diagrams/**/*.drawio`）を、閲覧者のブラウザで描画するための JS である（Issue #178）。
描画は `src/components/DrawioDiagram.tsx` が行い、Markdown の `![説明](/diagrams/xxx.drawio)` は `plugins/remark-drawio.js` がそのコンポーネントに置き換える。

このディレクトリのファイルは手で編集しない。更新するときは、下の手順で丸ごと取り直す。

## 同梱しているもの

| 項目 | 内容 |
|---|---|
| ファイル | `viewer-static.min.js` |
| 取得元 | `https://viewer.diagrams.net/js/viewer-static.min.js` |
| 版 | 32.7.0（ファイル内の `EditorUi.VERSION`） |
| sha256 | `5a6a873c302ad054262ff9b0e58a3ee9a65c130eca43cd14866fe9ef79f31638` |
| 取得日 | 2026-11-07 |
| ライセンス | Apache License 2.0（`LICENSE`。draw.io のリポジトリ jgraph/drawio から取得） |
| 同梱されているライブラリ | DOMPurify 3.4.17（Apache-2.0 または MPL-2.0）、pako 2.2.0（MIT と Zlib）、regenerator-runtime（MIT）。ライセンス表記はファイル内に埋め込まれている |

CDN から読み込まず同梱するのは、CDN の URL に版が含まれず更新が予告なく反映されること、社内のネットワークで外部への通信が遮られると図だけ表示されなくなること、閲覧者の情報を外部に送らないことのためである。

## 外部への通信について

閲覧用 JS は、既定では図形の定義（stencil）や画像を `viewer.diagrams.net` から取得する設定を持つ。ただし、組み込み済みの図形だけを使う図では取得が起きない。2026-11-07 時点の 20 枚の図で、外部へのリクエストが 0 件であることを確かめている。
利用状況の送信（`log.diagrams.net`）は、ホスト名が diagrams.net か draw.io のときだけ有効になり、GitHub Pages では送られない。

図を追加するときの制約（外部の画像や stencil、Web フォントを使わない等）は、`.claude/skills/drawio-skill/SKILL.md` の「ドキュメントサイトに載せる図」にある。

## 更新の手順

1. `viewer-static.min.js` を取得元から取り直し、ファイル内の `EditorUi.VERSION` で版を確かめる。
2. `src/components/DrawioDiagram.tsx` の `VIEWER_VERSION` を新しい版にする（ブラウザのキャッシュに古い JS が残らないように、URL の `?v=` に使っている）。
3. このファイルの「同梱しているもの」の版、sha256、取得日を更新する。
4. `bash scripts/build-docs.sh` でビルドし、図のあるページ（`reference/architecture`、`develop/playwright-guide`、`spec/api-spec` など）をブラウザで開いて、次を確かめる。
   - すべての図が描画され、ブラウザのコンソールにエラーが出ない
   - 開発者ツールのネットワークで、外部へのリクエストが無い
   - 図をクリックすると、ページの中で拡大表示が開く
   - ダークモードでも図が読める
