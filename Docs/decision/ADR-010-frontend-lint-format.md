---
type: adr
title: ADR-010 — フロントエンド：Lint / Format
description: フロントエンドの Lint・Format ツールとして oxlint + oxfmt を採用した判断の記録
tags: [frontend, lint, format, oxlint]
timestamp: 2026-05-28
---

# ADR-010 — フロントエンド：Lint / Format

## Status

Accepted

## Context

JavaScript / TypeScript の静的解析・コードフォーマットツールを決定する。候補は ESLint + Prettier / Biome / oxlint + oxfmt。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| oxlint + oxfmt | ★★ | ★★★ | ★★ | ★★ |
| Biome | ★★ | ★★★ | ★★ | ★★ |
| ESLint + Prettier | ★★ | ★★★ | ★★ | ★★ |

## Decision

**oxlint + oxfmt** を採用する。

- Rust 実装により ESLint 比で最大 50〜100 倍の速度
- oxfmt は Prettier 互換のフォーマッタ（2026 年 1 月 alpha リリース、5 月時点 v0.46.0）
- oxlint v1.61.0 は TypeScript / React / Next.js ルールを包括的にカバー
- Oxc プロジェクト（VoidZero）として活発にメンテナンスされている

## Consequences

- oxfmt が alpha のため、将来 Prettier 互換として安定版が出るまで設定は最小限にする
- `oxlint.json` で linting ルールを管理する
- CI のリント・フォーマットチェックは `oxlint .` と `oxfmt --check .` で実施する
- Editor 連携は VSCode の oxc 拡張（`oxc.vscode-oxc`）を使用する
