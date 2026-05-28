# ADR-003 — フロントエンド：UI コンポーネントライブラリ

## Status

Accepted

## Context

再利用可能な UI コンポーネントの供給元を決定する。候補は shadcn/ui / MUI / Chakra UI / 独自実装。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| shadcn/ui | ★★★ | ★★★ | ★★ | ★★ |
| MUI | ★★ | ★★★ | ★★ | ★ |
| Chakra UI | ★★ | ★★ | ★ | ★ |
| 独自実装 | ★ | ★ | — | ★ |

## Decision

**shadcn/ui** を採用する。

- コピペ（コード所有）方式のためソースコードを直接編集・カスタマイズできる
- Tailwind CSS v4 + React 19 に完全対応済み（2026年5月時点）
- `npx shadcn@latest add <component>` で必要なコンポーネントのみ追加できる
- ライブラリ依存ではなくプロジェクト内コードになるため、AI補完精度が高い
- Radix UI をプリミティブとして使用し、アクセシビリティが担保されている

## Consequences

- コンポーネントは `src/components/ui/` に配置される（shadcn/ui デフォルト）
- `components.json` で shadcn/ui の設定を管理する
- バージョン管理は shadcn/ui CLI での再追加（上書き）で行う
- `lucide-react` がアイコンライブラリとして導入される
