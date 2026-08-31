# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

## ディレクトリ構成

```
docs-next/
  docs/                     # ドキュメント本体（Markdown）
    learn/                  # 学習者が最初に読む（カリキュラム・環境構築・AI ツール・用語集）
    develop/                # 学習者が実装中に引く（開発フロー・規約・レビュー基準・選択課題カタログ）
    spec/                   # 仕様（要件・画面・API・ER 図）。真実の源
      enhancements/         # エンハンス課題の個別要件シート（難易度別）
    reference/              # 辞書的に引く（アーキテクチャ・デザイン・ADR・Claude Code 設定・AI-DLC 台帳）
      adr/                  # ADR（Architecture Decision Record）一覧
      aidlc/                # AI-DLC 採用台帳
      claude-code/          # Claude Code 設定台帳
    operations/             # 運営者向け（運用ガイド・Issue 起票手順・学習効果測定）
  src/
    components/             # トップページ用 React コンポーネント
    pages/                  # 独自ページ（index.tsx 等）
    css/                    # カスタム CSS
    theme/                  # Docusaurus テーマの上書き（DocItem 等）
  static/
    img/                    # 画像アセット
    assets/logos/           # 技術スタックのロゴ SVG
    design/                 # デザインショーケースの全画面プレビュー
    diagrams/               # draw.io 図（アーキテクチャ・API・ER図等）とその SVG 出力
  scripts/                  # last_updated 生成スクリプトと移行用スクリプト（migration/）
  docusaurus.config.ts      # Docusaurus 設定
  sidebars.ts               # サイドバー構成（ディレクトリ構造から自動生成）
```

`build/` と `.docusaurus/` はビルド生成物・キャッシュのため上記には含めていない（`.gitignore` 対象）。

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Using SSH:

```bash
USE_SSH=true npm run deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

If you are using GitHub Pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
