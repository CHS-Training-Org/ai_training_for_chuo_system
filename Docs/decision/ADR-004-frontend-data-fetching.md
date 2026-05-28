# ADR-004 — フロントエンド：データ取得戦略

## Status

Accepted

## Context

Next.js App Router でのサーバー・クライアント間データ取得パターンを決定する。
候補は Server Actions 主体 / TanStack Query / SWR。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Server Actions 主体 | ★★★ | ★★★ | ★★ | ★★ |
| TanStack Query | ★★ | ★★★ | ★★ | ★★ |
| SWR | ★★ | ★★ | ★★ | ★★ |

## Decision

**Server Actions 主体**（リアルタイム要件がある場合は TanStack Query を補完利用）を採用する。

- App Router ネイティブのアプローチで Next.js 公式推奨
- フォーム送信・ミューテーションを `action` 属性で直接紐づけられる
- クライアント JavaScript の量を最小化できる
- 認証トークンをサーバーサイドに閉じ込めやすく、BFF の役割と整合する

## Consequences

- `src/server/actions/` 配下に Server Actions ファイルをまとめる
- `"use server"` ディレクティブを必ず先頭に付与する
- サーバーコンポーネントからのデータ読み取りは `fetch` + キャッシュ戦略を使う
- ポーリング・楽観的更新が必要な画面は TanStack Query を部分導入することを許容する
