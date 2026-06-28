---
type: adr
title: ADR-009 — フロントエンド：テスト戦略
description: フロントエンドのテスト戦略として Vitest + Playwright + MSW を採用した判断の記録
tags: [frontend, testing, vitest, playwright, msw]
timestamp: 2026-05-28
---

# ADR-009 — フロントエンド：テスト戦略

## Status

Accepted

## Context

フロントエンドのテスト構成を決定する。ユニットテスト・コンポーネントテスト・E2E テスト・API モックの各層でツールを選定する。

| 候補（ユニット） | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Vitest | ★★★ | ★★★ | ★★ | ★★ |
| Jest | ★★ | ★★★ | ★★ | ★ |

| 候補（E2E） | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Playwright | ★★★ | ★★★ | ★★ | ★★ |
| Cypress | ★★ | ★★ | ★★ | ★ |

## Decision

**Vitest**（ユニット・コンポーネント）+ **Playwright**（E2E）+ **MSW**（API モック）を採用する。

- Vitest は Vite ベースで高速。ESM ネイティブかつ `@testing-library/react` と統合できる
- Playwright は主要ブラウザ実機テストが可能で Next.js 公式との統合が良好
- MSW（Mock Service Worker）で API レイヤーをモックし、バックエンド非依存のテストを実現する

## Consequences

- `frontend/tests/unit/` に Vitest テスト、`frontend/tests/e2e/` に Playwright テストを配置する
- `vitest.config.ts` と `playwright.config.ts` をそれぞれ設定する
- MSW の `handlers.ts` で API モック定義を一元管理する
- CI では Playwright を `--project=chromium` に絞り実行時間を短縮する
