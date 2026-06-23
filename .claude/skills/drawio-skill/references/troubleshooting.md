# トラブルシューティング — よくあるミス

レンダリング・エクスポート・レイアウト・エッジで何かおかしいときに読む。ほとんどは1行で解決できる。

> **BookFlow 版の注意**: このリポジトリでは draw.io CLI を使用しない。エクスポートは VSCode の `hediet.vscode-drawio` 拡張で行う。CLI 関連のトラブル（xvfb、--no-sandbox、repair_png など）はここでは対象外。

## XML・構造のミス

| ミス | 対処 |
|-----|------|
| `id="0"` と `id="1"` のルートセルが欠けている | `<root>` の先頭に必ず両方を記述する |
| シェイプが繋がらない | エッジの `source`/`target` が既存シェイプの `id` と一致しているか確認 |
| セルフクロージングエッジ（`<mxCell ... edge="1" />`） | `<mxGeometry relative="1" as="geometry" />` 子要素を持つ展開形式を使う — セルフクロージングはレンダリングされない |
| XML コメント内の `--` | XML 仕様違反 — ハイフン1本か別の言い回しに変更 |
| `value` 内の特殊文字 | XML エンティティを使用: `&amp;` `&lt;` `&gt;` `&quot;` |
| ラベル内のリテラル `\n` | `value` 属性の改行には `&#xa;` を使用 |
| シェイプの重なり | 複雑さに応じて間隔をスケール（200〜350px）。ルーティング廊下を確保 |
| エッジがシェイプを貫通する | ウェイポイントを追加、entry/exit ポイントを分散、または間隔を広げる |
| 矢印ヘッドが折れ目と重なる | ターゲットシェイプまでの最後のセグメントは ≥20px 確保 — 間隔を広げるかウェイポイントを追加 |
| イテレーションループが終わらない | 5 ラウンド後は draw.io デスクトップ（または https://app.diagrams.net/）で直接編集するよう提案 |

## VSCode 拡張のトラブル

| 症状 | 対処 |
|-----|------|
| `.drawio` を開いても拡張が起動しない | VSCode のコマンドパレット（Ctrl+Shift+P）→「Extensions: Show Installed Extensions」で `hediet.vscode-drawio` が有効になっているか確認。devcontainer を再起動すると自動インストールされる |
| 拡張でレンダリングされるが一部シェイプが空白ボックス | `shape=mxgraph.*` の名前が誤り。`scripts/shapesearch.py` で正式名を確認する |
| VSCode でのエクスポートで背景色がおかしい | 図の `mxGraphModel` に `background="#ffffff"` を追加、またはエクスポートダイアログで背景を指定 |
| 拡張が使えない環境でプレビューしたい | `python3 scripts/encode_drawio_url.py --edit <file>.drawio` でブラウザ URL を生成する |

## ブラウザフォールバック（encode_drawio_url.py）

WSL2 環境でブラウザ URL を開く場合、`cmd.exe` は URL のフラグメント（`#` 以降）を落とす。`.url` ショートカットファイル経由で開く:

```bash
URL=$(python3 <this-skill-dir>/scripts/encode_drawio_url.py --edit diagram.drawio)
TMP=$(mktemp --suffix=.url)
printf '[InternetShortcut]\r\nURL=%s\r\n' "$URL" > "$TMP"
cmd.exe /c start "" "$(wslpath -w "$TMP")"
```

macOS/Linux では `xdg-open "$URL"` を使えばよい（ワークアラウンド不要）。
