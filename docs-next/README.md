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
  docs/                     # ドキュメント本体（Markdown/MDX）
    intro.mdx               # トップページ
    overview.md             # リポジトリ概要
    requirements.md         # 要件定義
    screen-spec.md          # 画面仕様
    api-spec.md             # API 仕様
    er-diagram.md           # ER 図
    architecture.md         # アーキテクチャ全体
    curriculum.md           # 学習カリキュラム
    design.md               # 設計方針
    glossary.md             # 用語集
    getting-started.md      # セットアップガイド
    ai-tools-guide.md       # AI 利用ガイド
    claude-code-best-practices.md
    aidlc-adoption.md       # AI-DLC 採用台帳
    aidlc-audit.md          # AI-DLC 監査ログ
    aidlc-state.md          # AI-DLC 進捗トラッカー
    develop/                # 開発者向けガイド（コーディング規約・ワークフロー等）
    operations/             # 運用ガイド（Issue登録・学習効果測定等）
    reference/
      adr/                  # ADR（Architecture Decision Record）一覧
      claude-code/          # Claude Code 設定台帳
    spec/
      enhancements/         # エンハンス課題の個別仕様
    tutorial-basics/        # Docusaurus 標準チュートリアル（雛形）
    tutorial-extras/        # 同上
  blog/                     # ブログ記事（雛形含む）
  src/
    components/             # トップページ用 React コンポーネント
    pages/                  # 独自ページ（index.tsx 等）
    css/                    # カスタム CSS
    theme/                  # Docusaurus テーマの上書き（DocItem 等）
  static/
    img/                    # 画像アセット
    assets/logos/           # 技術スタックのロゴ SVG
    diagrams/               # draw.io 図（アーキテクチャ・API・ER図等）とその SVG 出力
  scripts/                  # Markdown 移行・整形用スクリプト（fix-*.mjs 等）
  docusaurus.config.ts      # Docusaurus 設定
  sidebars.ts               # サイドバー構成
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
