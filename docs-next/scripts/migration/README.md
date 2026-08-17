# 移行用スクリプト（実行しないこと）

Zensical から Docusaurus へ移行した際（[ADR-027](../../docs/reference/adr/ADR-027-docusaurus-migration.md)）に
一度だけ実行した使い捨てスクリプト群。記録として残しているだけで、**再実行してはいけない**。

再実行すると、すでに正しい状態のリンクを壊す。実際に移行時、`fix-links.mjs` が
ディレクトリインデックスページ（`index.md` / `README.md`）の兄弟リンクを
`./X.md` → `../X` に変換したことで 100 本超のリンクが壊れ、`fix-mdx.mjs` が
見出しの明示 ID を `\{#id}` にエスケープしたことでページ内アンカーが全滅した。

現在の運用では、`docusaurus.config.ts` の `onBrokenLinks` / `onBrokenAnchors` が
`'throw'` なので、同種の破損はビルドで検出される。リンクの一括修正が必要になった場合も、
このディレクトリのスクリプトを流用せず、その都度ビルドで検証しながら書き換えること。

なお、`.md` は `markdown.format: 'detect'` により CommonMark として解釈されるため、
見出しの明示 ID は `## 見出し {#anchor-id}` とそのまま書けばよい（エスケープ不要）。
