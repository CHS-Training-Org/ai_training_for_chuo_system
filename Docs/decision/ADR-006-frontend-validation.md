# ADR-006 — フロントエンド：バリデーション

## Status

Accepted

## Context

フロントエンドでのスキーマ定義・バリデーションライブラリを決定する。候補は Zod / Valibot / Yup。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Zod | ★★★ | ★★★ | ★★ | ★★ |
| Valibot | ★★ | ★★ | ★★ | ★★ |
| Yup | ★★ | ★★ | ★ | ★ |

## Decision

**Zod** を採用する。

- TypeScript エコシステムで最も広く採用されており AI 補完精度が最高水準
- スキーマから TypeScript 型を `z.infer<>` で自動導出できる
- React Hook Form の `zodResolver`（ADR-005）との統合が標準パターン
- Server Actions の入力バリデーションにも同じスキーマを再利用できる

## Consequences

- `@hookform/resolvers/zod` を経由して React Hook Form と統合する
- スキーマは `src/lib/schemas/` に集約する
- Server Actions 側でも同一スキーマで `.safeParse()` して二重検証を行う
