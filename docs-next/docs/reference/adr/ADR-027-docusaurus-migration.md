---
sidebar_position: 27
title: ADR-027 — ドキュメントサイトを Zensical から Docusaurus に移行する
tags:
  - docs
  - infrastructure
  - migration
status: proposed
date: 2026-08-01T00:00:00.000Z
deciders:
  - '@tomaf'
last_updated: '2026-08-01T11:56:18+09:00'
---

# ADR-027 — ドキュメントサイトを Zensical から Docusaurus に移行する

## 背景

現在の Zensical 製ドキュメントサイトに以下の課題がある：

- 最終更新日が表示されない
- ホーム画面が機能的でない（5gctextbook.com のような導線がない）
- ナビゲーションが深くリンク過多で見づらい
- カスタム CSS の保守コストが高い
- Python/uv 依存でフロントエンドスタックと不整合

## 決定

**Docusaurus (v3, TypeScript, Classic Preset) に移行する**

| 設定項目 | 採用案 |
|---------|--------|
| デプロイ先 | GitHub Pages (`/docs-next/` サブパスで並行運用後、切替) |
| i18n | 日本語のみ（英語スキャフォールドなし） |
| 検索 | ローカル検索 (`docusaurus-plugin-search-local`) |
| ADR 表示 | サイドバーに個別ファイルとして並べる |
| Mermaid | `@docusaurus/theme-mermaid` で標準移行 |
| 並行運用期間 | 検証完了まで（数日〜1週間） |

## 代替案と却下理由

| 代替案 | 却下理由 |
|--------|----------|
| Zensical 改修継続 | 最終更新日・検索・テーマ拡張がプラグイン非対応で実装コスト大 |
| MkDocs Material | Python 依存、React コンポーネント拡張不可、現行フロントスタックと不整合 |
| Astro Starlight | 検証済みだが Docusaurus の方がエコシステム・日本語情報が豊富 |
| GitBook / Notion | ベンダーロックイン、CI/CD 統合が弱い |

## 影響

- `zensical.toml`, `pyproject.toml`, `uv.lock` はアーカイブ（削除せず残置）
- `site/` (Zensical ビルド成果物) は GitHub Pages から外し、参考用に残置
- 既存 Markdown は frontmatter 微修正のみでほぼ流用可能
- CI/CD は `.github/workflows/docs.yml` を新規作成

## 移行計画フェーズ

1. **Phase 0**: ADR 作成、sidebars.ts 自動生成スクリプト作成
2. **Phase 1**: Docusaurus スキャフォールド、設定、CI/CD
3. **Phase 2**: コンテンツ移行、frontmatter 変換、アセット移行
4. **Phase 3**: カスタムコンポーネント開発
5. **Phase 4**: 機能統合・調整
6. **Phase 5**: 並行運用・カットオーバー

## 完了基準

- `npm run build` がエラー 0 で完了
- 全既存ページが `/docs-next/` で正常表示
- 最終更新日が全ページに表示される
- 検索が日本語で動作
- Mermaid 図が崩れず表示
- ホームページが 5gctextbook.com 風の導線を持つ
- GitHub Pages 本番 URL でアクセス可能

## 追記（2026-08-15）— 移行後のリファインメント

Phase 5（並行運用）の途中で、移行時に持ち越された構成の乱れとリンク破損をまとめて解消した。

**構成**：`docs/` 直下に平置きされていた 17 ファイルを、読者と目的による 5 ディレクトリ
（`learn/` `develop/` `spec/` `reference/` `operations/`）に整理し、URL も新構成に合わせた。
Docusaurus のテンプレート雛形（`intro.mdx`・`tutorial-basics/`・`tutorial-extras/`・`blog/`）は
サイドバー未登録のまま URL と検索インデックスには載っていたため削除した。
旧トップページ `intro/overview.md` は `src/pages/index.tsx` と役割が重複していたため削除した。

**サイドバー**：手書きで doc ID を列挙していた 5 本を、ディレクトリ構造からの自動生成
（`_category_.json` でラベルと順序を指定）に置き換えた。手書きだったころは
4 ファイルが 2 つのサイドバーに二重登録され、3 ファイルはどこにも載っていなかった。
自動生成なら、ファイルを追加してサイドバーに載せ忘れる事故が構造的に起きない。

**破損の解消**：壊れたリンク 103 件・壊れたアンカー 37 件を修正した。原因は移行スクリプトの
2 つの副作用で、(1) ディレクトリインデックスページの兄弟リンクが 1 階層ずれた、
(2) 見出しの明示 ID が `\{#id}` にエスケープされ無効化された、というもの。
(2) の根治として `markdown.format` を `'detect'` にし、`.md` を CommonMark として解釈するようにした
（`{#id}` と生 HTML がそのまま書ける。`design.md` をビルド対象から外していた理由も解消した）。

**再発防止**：`onBrokenLinks` / `onBrokenAnchors` / `onBrokenMarkdownLinks` を `'throw'` に上げ、
PR 時点でビルド検証する workflow（`.github/workflows/docs-check.yml`）を追加した。
破損を生んだ使い捨ての移行スクリプトは `docs-next/scripts/migration/` に隔離した。
