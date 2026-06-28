---
type: adr
title: ADR-007 — フロントエンド：クライアント状態管理
description: クライアント側の状態管理ライブラリとして Zustand を最小限採用した判断の記録
tags: [frontend, state-management, zustand]
timestamp: 2026-05-28
---

# ADR-007 — フロントエンド：クライアント状態管理

## Status

Accepted

## Context

Server Actions 主体（ADR-004）でサーバー側状態は最小化されているが、UI ローカル状態（モーダル開閉・フィルタ・選択状態等）の管理手段を決定する。候補は Zustand / Jotai / React Context のみ。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Zustand | ★★★ | ★★★ | ★★ | ★★ |
| Jotai | ★★ | ★★ | ★★ | ★★ |
| React Context のみ | ★★★ | ★★★ | — | ★★ |

## Decision

**Zustand** を採用する。

- フックベースのシンプルな API で概念理解が早い
- ボイラープレートが最小（Provider 不要）
- Redux DevTools に対応しており状態デバッグが容易
- 必要な状態量が多い場面でも React Context より再レンダリングを抑制できる

## Consequences

- `src/lib/stores/` にストアファイルを配置する
- グローバル状態は最小限に留め、基本は Server Components + Server Actions で完結させる
- Zustand の `persist` ミドルウェアは要件が確定してから追加する
