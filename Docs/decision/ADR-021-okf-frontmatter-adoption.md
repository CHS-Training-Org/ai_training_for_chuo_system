---
type: adr
title: ADR-021 — ドキュメント：OKF 準拠 frontmatter の部分採用
description: OKF（Open Knowledge Format）調査を踏まえ、frontmatter 規律のみを BookFlow の全 Docs に採用した判断の記録
tags:
  - docs
  - frontmatter
  - okf
  - metadata
timestamp: 2026-06-18
---

# ADR-021 — ドキュメント：OKF 準拠 frontmatter の部分採用

## Status

Accepted（2026-06-18）

## Context

[GoogleCloudPlatform/knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) を調査した結果、OKF（Open Knowledge Format）は「Markdown + YAML frontmatter で知識メタデータを表現するベンダー中立フォーマット（v0.1 / PoC）」であることが判明した。

調査結果の要点：

- **ジャンル**: OKF の設計中心は GA4 / StackOverflow / Bitcoin 等の**データ資産カタログ（BigQuery・Dataplex・Collibra 等からのメタデータ export）**。本リポジトリの `Docs/` は設計・仕様文書であり、対象ジャンルが異なる。
- **差分価値**: OKF が謳う利点（git 管理・Markdown・`index.md`・相互リンク・サイト化）は本リポジトリが既に実現済みで、全面採用の incremental value が小さい。
- **成熟度**: v0.1 / PoC 段階のため、リポジトリ標準として採用するリスクがある。

一方、OKF の中核である **frontmatter 規律**（`type` 必須 + 推奨フィールド群）には適用価値がある。本リポジトリの Docs 65 ファイルは現状 frontmatter 皆無で、機械可読なメタデータが存在しない。Zensical（ドキュメントサイト生成ツール）は frontmatter を正式サポートし、正しい YAML なら本文に漏れない。

| 観点 | 評価 |
|------|------|
| OKF フォーマット全体 | 非採用（データカタログ向けでジャンル不一致） |
| OKF frontmatter 規律 | 採用（機械可読メタの最小標準として有用） |

## Decision

**OKF フォーマット全体は不採用。frontmatter 規律のみを BookFlow 標準として全 Docs に採用する。**

### frontmatter スキーマ（BookFlow 標準）

OKF v0.1 準拠（`type` 必須 + 推奨群）＋ BookFlow 拡張キー（OKF はカスタムキー追加を明示的に許容）：

```yaml
---
type: <type-value>   # 必須。下記語彙から1つ
title: ...           # 推奨。本文 H1 と一致させる
description: ...     # 推奨。1文要約
tags:                # 推奨。分類。必ずブロック形式（下記）で記述する
  - <タグ>
  - ...
timestamp: YYYY-MM-DD # 推奨。ISO 8601。最終更新日
audience: ...        # BookFlow 拡張。旧『> 対象読者』の統合先
references:          # BookFlow 拡張。旧『> 参照』の統合先（リストで列挙）
  - Docs/...
---
```

> **`tags` はブロック形式で記述すること。**
> フロー形式 `tags: [a, b]` は YAML として有効だが、Zensical の Markdown パーサーが
> frontmatter 内の `[a, b]` をリンク参照として誤解析し、`unresolved link reference`
> 警告が全ファイル分発生する。ブロック形式（`- item` リスト）を使えば発生しない。

### `type` 語彙（ディレクトリ対応）

| ディレクトリ | type |
|-------------|------|
| `Docs/decision/ADR-*.md` | `adr` |
| `Docs/decision/README.md` / 各 `index.md` | `index` |
| `Docs/spec/*.md`（通常仕様） | `spec` |
| `Docs/spec/aidlc-state.md` | `state` |
| `Docs/spec/aidlc-audit.md` | `audit` |
| `Docs/spec/aidlc-adoption.md` | `adoption` |
| `Docs/spec/enhancements/*.md` | `spec`（index.md は `index`） |
| `Docs/guide/*.md` | `guide`（index.md は `index`） |
| `Docs/plan/*.md` | `plan` |
| `Docs/design.md` / `Docs/ARCHITECTURE.md` | `design` |
| `Docs/index.md` / `Docs/plan/PHASE4_AI_DRIVEN_DEV_TASKS.md` | それぞれ `index` / `plan` |
| `Docs/claude/*.md`（Claude Code 設定台帳） | `agent-config`（index.md は `index`） |

### 移行方針

- 本文冒頭の `> 対象読者：…` → frontmatter `audience:` に統合し本文から削除
- 本文冒頭の `> 参照：…` → frontmatter `references:` に統合し本文から削除
- 上記以外の `>` ブロック（実装メモ・スコープ注記・エンジン指示等）は本文に残す

## Consequences

**ポジティブ**：
- 全 Docs が `type` で機械的に分類可能になる（エージェントによるフィルタリング・ルーティングが容易）
- 著者・対象読者・参照リンクが frontmatter に集約され、本文がコンテンツに集中できる
- OKF の思想に準拠しつつ、データカタログ向け構造（bundle ディレクトリ・log.md 等）には踏み込まない

**留意点**：
- Zensical の表示タイトルは本文 H1 優先のため、`title` frontmatter と H1 が二重管理になる。両者は一致させること
- 不正な YAML（閉じ区切り欠落・インデント不正等）は Zensical が frontmatter を本文として表示する（サイレント失敗）。導入後はビルド確認必須
- nav は手動列挙（`zensical.toml`）のため、frontmatter 追加が自動的に nav に反映されることはない

## 参照

- [OKF v0.1 仕様](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [ADR-020](./ADR-020-aidlc-engine-adoption.md)（AI-DLC エンジン採用。本 ADR と同日の判断）
- [`Docs/decision/README.md`](./README.md)（ADR テンプレート・frontmatter スキーマ定義）
