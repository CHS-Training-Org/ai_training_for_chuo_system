# ADR-001 — フロントエンド：パッケージマネージャ

## Status

Accepted

## Context

フロントエンド（Next.js）の依存管理ツールを決定する。候補は npm / yarn / pnpm。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| pnpm | ★★★ | ★★★ | ★★ | ★★ |
| npm | ★★★ | ★★★ | ★★ | ★★ |
| yarn | ★★ | ★★ | ★★ | ★★ |

## Decision

**pnpm** を採用する。

- シンボリックリンク方式によるディスク効率とインストール速度が優れる
- ゴーストパッケージ（未宣言依存）を防ぐ厳格な依存解決アルゴリズム
- Turborepo / monorepo との親和性が高い
- Node.js 22 同梱の `corepack enable pnpm` で追加インストール不要

## Consequences

- `package-lock.json` ではなく `pnpm-lock.yaml` をコミット管理する
- CI では `pnpm install --frozen-lockfile` でロック固定インストールを行う
- `.npmrc` に `shamefully-hoist=false`（デフォルト）を維持し厳格モードを保つ
