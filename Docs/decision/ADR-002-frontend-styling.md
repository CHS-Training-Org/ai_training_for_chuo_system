# ADR-002 — フロントエンド：スタイリング

## Status

Accepted

## Context

Next.js App Router 配下のスタイリング方針を決定する。候補は Tailwind CSS / CSS Modules / Vanilla Extract。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Tailwind CSS v4 | ★★★ | ★★★ | ★★ | ★★ |
| CSS Modules | ★★★ | ★★ | ★★ | ★★ |
| Vanilla Extract | ★ | ★ | ★★ | ★ |

## Decision

**Tailwind CSS v4** を採用する。

- ユーティリティファーストで HTML を見るだけでスタイルが把握できる（学習コスト低）
- Copilot / Claude のコード生成精度が最高水準
- shadcn/ui（ADR-003）が Tailwind v4 + React 19 に完全対応済み
- v4 より CSS ファイルベースの設定（`@import "tailwindcss"`）となり、設定ファイル記述量が激減

## Consequences

- `tailwind.config.ts` は v4 では基本不要（CSS ファイルで完結）
- PostCSS プラグインとして `@tailwindcss/postcss` を使用する
- OKLCH カラーシステムに移行するため、ブラウザ互換に注意（モダンブラウザ対象）
- shadcn/ui テーマは CSS 変数 + `@theme inline` パターンで管理する
