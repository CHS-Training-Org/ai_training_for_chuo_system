---
type: adr
title: ドキュメントサイトを Zensical から Docusaurus に移行する
status: proposed
date: 2026-08-01
deciders: ["@tomaf"]
tags: ["docs", "infrastructure", "migration"]
---

# ADR-027: ドキュメントサイトを Zensical から Docusaurus に移行する

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