---
type: adr
title: ADR-008 — フロントエンド：認証クライアント
description: フロントエンドの認証クライアントとして Better Auth + Cognito 連携を採用した判断の記録
tags: [frontend, auth, better-auth, cognito]
timestamp: 2026-05-28
---

# ADR-008 — フロントエンド：認証クライアント

## Status

Accepted

## Context

Next.js から cognito-local（Cognito モック）を利用した認証フローを管理するライブラリを決定する。候補は Auth.js (NextAuth) / Better Auth / 自前実装（cognito-local 直叩き）。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Better Auth | ★★ | ★★★ | ★★ | ★★ |
| Auth.js (NextAuth) | ★★ | ★★★ | ★ | ★★ |
| 自前実装 | ★ | ★ | — | ★ |

## Decision

**Better Auth** を採用する。

- Auth.js (NextAuth) の開発チームが 2026 年に合流し、新規プロジェクトは Better Auth が公式推奨
- Cognito JWT の検証を `genericOAuth` プロバイダー経由で設定できる
- セッション管理・MFA・パスキーなどを公式プラグインで段階拡張できる
- 完全 TypeScript 対応で型安全

## Consequences

- `src/lib/auth.ts` に Better Auth インスタンスを初期化する
- cognito-local のユーザープール設定と JWT issuer を環境変数で切り替える
- `src/server/` の Server Actions から `auth()` ヘルパーでセッションを取得する
- Auth.js からの移行が将来発生した場合は公式移行ガイドに従う
