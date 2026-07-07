---
type: agent-config
title: Claude Code 設定台帳
description: BookFlow リポジトリにインストールされている Rules・Skills・Hooks・その他設定の一覧と呼び出し方
tags:
  - claude
  - agent-config
  - rules
  - skills
  - hooks
timestamp: 2026-07-07
audience: 学習者・メンター
references:
  - Docs/spec/aidlc-adoption.md
  - Docs/guide/dev-workflow.md
  - Docs/guide/ai-tools-guide.md
  - .claude/settings.json
---

# Claude Code 設定台帳

このページは「今このリポジトリに何がインストールされていて、どう呼び出すか」を確認するためのリファレンスです。

- **採用の経緯・由来**: [`Docs/spec/aidlc-adoption.md`](../spec/aidlc-adoption.md)
- **ワークフローでの使い方**: [`Docs/guide/dev-workflow.md`](../guide/dev-workflow.md)
- **Claude Code の基本操作**: [`Docs/guide/ai-tools-guide.md`](../guide/ai-tools-guide.md)

---

## Rules { #rules }

`.claude/rules/` 配下のファイルは、Claude Code の起動時に**自動でロード**されます。明示的な呼び出しは不要です。

| ファイル | 目的 |
|---------|------|
| `aidlc-core.md` | AI-DLC 起動判断の薄いポインタ。`/aidlc` の明示起動、または「AI-DLC で進めて」等の意図指定を検知したときにだけ `aidlc` スキルを起動する。指定のない小修正・質問では起動しない |
| `aidlc-guardrails.md` | AI 駆動開発のガードレール。過信防止・出力粒度調整・コンテンツ検証・ASCII 図規約を定義する |
| `aidlc-questions.md` | 確認質問の様式。`AskUserQuestion`（要件確認）と `ExitPlanMode`（計画承認）の使い分けを規定する |

各ルールの詳細実装は `.aidlc-rule-details/` 配下のステージファイルにあります（`aidlc` スキルが起動時に参照するオンデマンド読み込み対象）。

---

## Skills { #skills }

### リポジトリ独自スキル

`.claude/skills/` 配下に定義されたスキルです。以下のトリガー文言でスラッシュコマンドとして呼び出せます。

| スキル | 呼び出し | 役割 |
|-------|---------|------|
| `aidlc` | `/aidlc`、または「AI-DLC で進めて」等の明示的な意図指定 | AI-DLC エンジン本体。BookFlow 標準開発ワークフロー（INCEPTION → CONSTRUCTION → OPERATIONS の3フェーズ・per-stage 承認ゲート・監査ログ）を駆動する。起動条件を満たさない小修正・質問では発動しない（`aidlc-core.md` が起動判断を担う） |
| `update-spec` | `/update-spec` | `Docs/spec/`（requirements / screen-spec / api-spec / er-diagram）を Spec-first ルールに沿って更新・新規作成する。実装より**先**に起動するのが正解 |
| `draft-pr` | `/draft-pr` | PR タイトル・本文を `.github/PULL_REQUEST_TEMPLATE.md` の様式で下書き生成する。コミット・push・PR 作成は行わない |
| `drawio-skill` | `/drawio-skill` または「図を描いて」「ER図を作って」「アーキ図を書いて」などのトリガーで自動発動 | `.drawio` 図（アーキ図・ER図・フローチャート・UML など）を生成・編集する。draw.io CLI は使用せず、VSCode の `hediet.vscode-drawio` 拡張でレンダリング・エクスポートする。上流: [Agents365-ai/drawio-skill v1.14.0](https://github.com/Agents365-ai/drawio-skill/tree/v1.14.0)（MIT）の BookFlow 翻案 |

> **Spec-first 運用**: コードを書く前に `/update-spec` を起動し、仕様書を更新してからコード実装に進む（[dev-workflow.md §3](../guide/dev-workflow.md) 参照）。

### 公式プラグイン（`enabledPlugins` で有効化）

`.claude/settings.json` の `enabledPlugins` で有効化されている `@claude-plugins-official` 配下のスキルです。リポジトリ独自定義ではないため、仕様の詳細はプラグイン側のドキュメントを参照してください。

| プラグイン名 | 主な用途 |
|------------|---------|
| `frontend-design` | 高品質なフロントエンド UI の生成 |
| `code-review` | PR・差分のコードレビュー |
| `skill-creator` | スキルの作成・改善・評価 |
| `claude-md-management` | CLAUDE.md ファイルの監査・改善 |

---

## Hooks { #hooks }

現在、このリポジトリには**フックは設定されていません**（`.claude/settings.json` の `"hooks": {}`）。

フックを追加する場合は `.claude/settings.json` の `hooks` セクションを編集します。詳細は Claude Code のドキュメントを参照してください。

---

## その他の設定 { #other-config }

### statusLine スクリプト

`.claude/scripts/statusline-command.sh`：model / トークン数 / git ブランチ / コンテキスト使用率 / レートリミット（5h、7d、JST）をダッシュボード形式で表示する読み取り専用スクリプト。  
`.claude/settings.json` の `statusLine` から呼び出されます。

### Permissions

ローカルの権限設定は `.claude/settings.local.json`（`.gitignore` 対象・個人環境用）が正典です。現在の許可コマンド例（`.claude/settings.local.json` の `permissions.allow`）:

- `Bash(curl -s --max-time 5 http://backend:8080/actuator/health)`：ヘルスチェック確認
- `WebFetch(domain:github.com)`：GitHub ページの参照
- `WebSearch`：Web 検索

実際の設定値は `.claude/settings.local.json` を直接参照してください（個人環境で異なる場合があります）。

### 言語・モデル設定

`.claude/settings.json` で定義されています。

| 設定 | 値 |
|-----|---|
| `language` | japanese |
| `advisorModel` | opus |
| `autoUpdatesChannel` | latest |
| `theme` | auto |
