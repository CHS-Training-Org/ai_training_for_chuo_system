---
type: adr
title: ADR-005 — フロントエンド：フォームライブラリ
description: フロントエンドのフォーム管理ライブラリとして React Hook Form を採用した判断の記録
tags:
  - frontend
  - forms
  - react-hook-form
timestamp: 2026-05-28
---

# ADR-005 — フロントエンド：フォームライブラリ

## Status

Accepted

## Context

クライアントサイドフォームの状態管理・バリデーション統合を担うライブラリを決定する。
候補は React Hook Form / Conform / 標準 form action。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| React Hook Form | ★★★ | ★★★ | ★★ | ★★ |
| Conform | ★★ | ★★ | ★★ | ★★ |
| 標準 form action | ★★★ | ★★ | — | ★★ |

## Decision

**React Hook Form** を採用する。

- 業界標準（週間 DL 数トップ）で AI 補完精度が最高水準
- `zodResolver`（ADR-006 Zod との統合）で型安全なバリデーションが 1 ステップで実現できる
- アンコントロールドコンポーネントベースで不要な再レンダリングを抑制
- shadcn/ui の Form コンポーネントが React Hook Form を前提として構築されている

## Consequences

- `@hookform/resolvers` を依存に追加し `zodResolver` を使用する
- shadcn/ui の `<Form>` / `<FormField>` / `<FormItem>` コンポーネントを利用する
- Server Actions との併用は `form.handleSubmit` → Server Action 呼び出しのパターンで行う
