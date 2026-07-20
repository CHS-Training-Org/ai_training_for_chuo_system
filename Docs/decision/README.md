---
type: index
title: ADR（Architecture Decision Records）ガイド
description: BookFlow における ADR の命名規則・フォーマット・起票プロセスと全 ADR の一覧
tags:
  - adr
  - decision
  - guide
timestamp: 2026-06-18
audience: メンター・リポジトリ管理者・学習者
references:
  - Docs/spec/overview.md
  - Docs/spec/index.md
---

# ADR（Architecture Decision Records）ガイド

このディレクトリには、BookFlow の技術選定・設計上の重要な意思決定を記録した ADR（Architecture Decision Records）が格納されています。

---

## ADR とは

ADR（Architecture Decision Record）は、プロジェクトで行った技術的な意思決定を記録するドキュメントです。

- **なぜその決定をしたか**（背景・トレードオフ）
- **何を決めたか**（採用した選択肢と理由）
- **結果として何が起きるか**（影響・運用上の制約）

を一か所にまとめることで、後から参加するメンバー（学習者・AI エージェント）が「なぜこうなっているのか」を素早く理解できます。

---

## ADR の命名規則

```
ADR-NNN-kebab-case.md
```

- `NNN`：3 桁の連番（例：001, 012）
- `kebab-case`：テーマを英語の小文字ハイフン区切りで記述
- 例：`ADR-001-frontend-package-manager.md`

> **注意**：既存の ADR-001〜019 はすべて `ADR-NNN-kebab-case.md` 形式で作成されており、この形式が正式な命名規則です。

---

## ADR のフォーマット（Michael Nygard 形式）

新規 ADR を作成する際は以下のテンプレートを使用してください。

```markdown
---
type: adr
title: ADR-NNN — <領域>：<テーマ>
description: <採用判断の1文要約>
tags:
  - <領域タグ>
  - ...
timestamp: YYYY-MM-DD
---

# ADR-NNN — <領域>：<テーマ>

## Status

Accepted（YYYY-MM-DD）

## Context

（背景・解決すべき課題・検討した候補の比較表）

| 候補 | 評価軸1 | 評価軸2 | 評価軸3 |
|------|--------|--------|--------|
| 候補A | ★★★ | ★★ | ★★ |
| 候補B | ★★ | ★★★ | ★★★ |

## Decision

**<採用案>** を採用する。

- 採用理由 1
- 採用理由 2

## Consequences

- 採用による運用上の制約・影響 1
- 採用による運用上の制約・影響 2
```

### Status の値

| 値 | 意味 |
|----|------|
| `Proposed` | 提案中・未決定 |
| `Accepted` | 採用・実施済み |
| `Deprecated` | 廃止（後継 ADR 番号をメモ欄に記載） |
| `Superseded` | 別の ADR に置き換え済み |

---

## 起票プロセス

1. `ADR-NNN-<テーマ>.md` ファイルを作成（NNN は現在の最大番号 + 1）
2. Status を `Proposed` として Draft PR を作成
3. チームレビューを経て `Accepted` に更新し、マージ

---

## ADR 一覧

### フロントエンド（ADR-001〜010）

| # | テーマ | Status |
|---|--------|--------|
| [ADR-001](./ADR-001-frontend-package-manager.md) | パッケージマネージャ | Accepted |
| [ADR-002](./ADR-002-frontend-styling.md) | スタイリング | Accepted |
| [ADR-003](./ADR-003-frontend-ui-components.md) | UI コンポーネントライブラリ | Accepted |
| [ADR-004](./ADR-004-frontend-data-fetching.md) | データ取得戦略 | Accepted |
| [ADR-005](./ADR-005-frontend-form-library.md) | フォームライブラリ | Accepted |
| [ADR-006](./ADR-006-frontend-validation.md) | バリデーション | Accepted |
| [ADR-007](./ADR-007-frontend-client-state.md) | クライアント状態管理 | Accepted |
| [ADR-008](./ADR-008-frontend-auth-client.md) | 認証クライアント | Accepted |
| [ADR-009](./ADR-009-frontend-test-strategy.md) | テスト戦略 | Accepted |
| [ADR-010](./ADR-010-frontend-lint-format.md) | Lint / Format | Accepted |

### バックエンド（ADR-011〜019）

| # | テーマ | Status |
|---|--------|--------|
| [ADR-011](./ADR-011-backend-build-tool.md) | ビルドツール | Accepted |
| [ADR-012](./ADR-012-backend-orm.md) | データアクセス（ORM） | Accepted |
| [ADR-013](./ADR-013-backend-db-migration.md) | DB マイグレーション | Accepted |
| [ADR-014](./ADR-014-backend-validation.md) | バリデーション | Accepted |
| [ADR-015](./ADR-015-backend-api-docs.md) | API ドキュメント | Accepted |
| [ADR-016](./ADR-016-backend-auth.md) | 認証・認可 | Accepted |
| [ADR-017](./ADR-017-backend-logging.md) | ロギング戦略 | Accepted |
| [ADR-018](./ADR-018-backend-test-strategy.md) | テスト戦略 | Accepted |
| [ADR-019](./ADR-019-backend-code-quality.md) | コード品質ツール | Accepted |

### AI・ドキュメント（ADR-020〜）

| # | テーマ | Status |
|---|--------|--------|
| [ADR-020](./ADR-020-aidlc-engine-adoption.md) | AI-DLC エンジン完全採用 | Accepted |
| [ADR-021](./ADR-021-okf-frontmatter-adoption.md) | OKF 準拠 frontmatter 部分採用 | Accepted |
| [ADR-023](./ADR-023-mentor-gate-removal.md) | 運用プロセス：承認ゲート廃止・セルフ完結運用への移行 | Accepted |
| [ADR-024](./ADR-024-ai-first-review-adoption.md) | AI一次レビュー（検討A）の採用 | Accepted |

### 開発環境（ADR-022〜）

| # | テーマ | Status |
|---|--------|--------|
| [ADR-022](./ADR-022-wsl-container-future-adoption.md) | WSL Container（wslc）の将来採用 | Proposed |
