---
sidebar_position: 1
title: Claude Code 設定台帳
description: BookFlow リポジトリにインストールされている Rules・Skills・Hooks・その他設定の一覧と呼び出し方
tags:
  - claude
  - agent-config
  - rules
  - skills
  - hooks
audience: 学習者・運営者
references:
  - ../aidlc/adoption.md
  - ../../develop/dev-workflow.md
  - ../../learn/ai-tools-guide.md
  - .claude/settings.json
last_updated: '2026-09-27T00:00:00+09:00'
---

# Claude Code 設定台帳

このページは「今このリポジトリに何がインストールされていて、どう呼び出すか」を確認するためのリファレンスです。

- **採用の経緯・由来**: [AI-DLC 採用台帳](../aidlc/adoption.md)
- **ワークフローでの使い方**: [開発ワークフローガイド](../../develop/dev-workflow.md)
- **Claude Code の基本操作**: [AI ツール活用ガイド](../../learn/ai-tools-guide.md)

---

## Rules
`.claude/rules/` 配下のファイルは、Claude Code の起動時に**自動でロード**されます。明示的な呼び出しは不要です。

| ファイル | 目的 |
|---------|------|
| `aidlc-core.md` | AI-DLC 起動判断の薄いポインタ。`/aidlc` の明示起動、または「AI-DLC で進めて」等の意図指定を検知したときにだけ `aidlc` スキルを起動する。指定のない小修正・質問では起動しない |
| `aidlc-guardrails.md` | AI 駆動開発のガードレール。過信防止・出力粒度調整・コンテンツ検証・ASCII 図規約を定義する |
| `aidlc-questions.md` | 確認質問の様式。`AskUserQuestion`（要件確認）とチャットでの直接承認（計画承認）の使い分けを規定する |
| `agent-config-sync.md` | AI-DLC 非依存の横断ルール。`.claude/rules/` `.claude/skills/*/SKILL.md` `.claude/settings.json` のいずれかを変更したら、同じ変更でこの台帳（本ページ）も追従させる |

各ルールの詳細実装は `.aidlc-rule-details/` 配下のステージファイルにあります（`aidlc` スキルが起動時に参照するオンデマンド読み込み対象）。

---

## Skills
### リポジトリ独自スキル

`.claude/skills/` 配下に定義されたスキルです。以下のトリガー文言でスラッシュコマンドとして呼び出せます。

| スキル | 呼び出し | 役割 |
|-------|---------|------|
| `create-issue` | `/create-issue`、または「issueを起票して」「課題issueを立てたい」等 | GitHub Issue を対話形式で聞き取り、テンプレート様式の本文を組み立てて `gh issue create` で実際に起票する。選択課題（エンハンス）と汎用 Issue の2種別に対応する。選択課題ではビジネス要求シートの存在確認を起票前に必須で行い、シートの依存関係節を Issue の `依存関係` 欄へ自動転記する（リンクは Issue 番号表記へ変換） |
| `aidlc` | `/aidlc`、または「AI-DLC で進めて」等の明示的な意図指定 | AI-DLC エンジン本体。BookFlow 標準開発ワークフロー（INCEPTION → CONSTRUCTION → OPERATIONS の3フェーズ・per-stage 承認ゲート・監査ログ）を駆動する。起動条件を満たさない小修正・質問では発動しない（`aidlc-core.md` が起動判断を担う）。特別な指示がない限り `docs-next/docs/spec/enhancements/` 配下のビジネス要求シートをタスクの既定の源として扱う。エンジン開始前の Pre-flight で、新規ワークフロー開始時のみ（レジューム時はスキップ）対象エンハンス課題を特定し、ブランチ作成し忘れを検知した場合は short-desc・Issue 番号（`gh issue list` 検索。失敗時は手動確認）から組み立てたブランチ名を提案し、承認を得てから作成する |
| `update-spec` | `/update-spec` | `docs-next/docs/spec/`（requirements / screen-spec / api-spec / er-diagram）を Spec-first ルールに沿って更新・新規作成する。実装より**先**に起動するのが正解 |
| `commit-push` | `/commit-push`、または「差分をコミットして」「いい感じに分割してコミットして」等 | 差分を意味のある単位に分割し、ブランチ・分割内容・push有無をまとめて確認したうえで `git commit`（複数回）・`git push` を実行する |
| `create-pr` | `/create-pr` | PR タイトル・本文を `.github/PULL_REQUEST_TEMPLATE.md` の様式で組み立てる。head/base ブランチと、下書きのみか `gh pr create` で実際に作成するかを実行前にまとめて確認する。コミットの分割・push は `commit-push` の役割 |
| `drawio-skill` | `/drawio-skill` または「図を描いて」「ER図を作って」「アーキ図を書いて」などのトリガーで自動発動 | `.drawio` 図（アーキ図・ER図・フローチャート・UML など）を生成・編集する。draw.io CLI は使用せず、VSCode の `hediet.vscode-drawio` 拡張でレンダリング・エクスポートする。上流: [Agents365-ai/drawio-skill v1.14.0](https://github.com/Agents365-ai/drawio-skill/tree/v1.14.0)（MIT）の BookFlow 翻案 |
| `generate-test-perspectives` | `/generate-test-perspectives`、または「試験観点を作って」「E2E テストの観点を洗い出して」等 | 任意の画面について、仕様書（`docs-next/docs/spec/`）だけを根拠に結合テスト（E2E）の試験観点一覧を新規作成する。対象画面はプロンプトから特定し、特定できなければ確認する。根拠にした仕様・確認しない観点・仕様確認事項（仕様の食い違いと、仕様に書かれていない点）を併記して `Docs/test/<スラッグ>/perspectives.md` に保存し、ワークフローの状態ファイルを作って試験観点の段階を「レビュー待ち」にする（`scripts/e2e-workflow/state.mjs` 経由）。優先度は付けない（載せた観点はすべてテストする）。仕様に書かれていない点は観点にしない。実装コードは読まない。`/generate-test-perspectives` とスラッシュで直接呼んだときは Opus に切り替わる（frontmatter の `model: opus`。次の入力でセッションのモデルに戻る）。スラッシュなしの依頼や、別のスキルの中から呼ばれた場合は切り替わらない。既存の観点の更新、試験ケース・Playwright コードの作成は対象外 |
| `e2e-workflow` | `/e2e-workflow`、または「結合テストを進めたい」「今どの段階？」等 | 結合テストの4つの段階（試験観点、試験ケース、テストコード、実行）と学習者の関門を進める案内役。画面ごとの状態ファイル（`Docs/test/<スラッグ>/state.json`）を `scripts/e2e-workflow/state.mjs` 経由で読み、今の段階と次にやることを示す。試験観点の段階では `generate-test-perspectives` を呼び出す（状態の更新は呼び出し先が行う）。差し戻された観点一覧は、指摘と、学習者がダッシュボードで選んだ仕様の食い違いへの回答をもとに自分で直し（既存の ID は振り直さない）、状態を「レビュー待ち」に戻す。関門の確定と差し戻し、回答は行わず、ダッシュボード（`scripts/e2e-workflow/server.mjs`）で学習者が行う。試験ケース以降は手順ページの案内だけ。frontmatter の `model: opus` により、`/e2e-workflow` とスラッシュで呼んだときはターンの終わりまで Opus で動く（中から呼ぶ `generate-test-perspectives` も含む） |

> **Spec-first 運用**: コードを書く前に `/update-spec` を起動し、仕様書を更新してからコード実装に進む（[仕様を更新する](../../develop/dev-workflow.md#flow) 参照）。

### 公式プラグイン（`enabledPlugins` で有効化）

`.claude/settings.json` の `enabledPlugins` で有効化されている `@claude-plugins-official` 配下のスキルです。リポジトリ独自定義ではないため、仕様の詳細はプラグイン側のドキュメントを参照してください。

| プラグイン名 | 主な用途 |
|------------|---------|
| `frontend-design` | 高品質なフロントエンド UI の生成 |
| `code-review` | PR・差分のコードレビュー |
| `skill-creator` | スキルの作成・改善・評価 |
| `claude-md-management` | CLAUDE.md ファイルの監査・改善 |

---

## Hooks
現在、このリポジトリには**フックは設定されていません**（`.claude/settings.json` の `"hooks": {}`）。

フックを追加する場合は `.claude/settings.json` の `hooks` セクションを編集します。詳細は Claude Code のドキュメントを参照してください。

---

## その他の設定 {#other-config}
### statusLine スクリプト

`.claude/scripts/statusline-command.sh`：model / トークン数 / git ブランチ / コンテキスト使用率 / レートリミット（5h、7d、JST）をダッシュボード形式で表示する読み取り専用スクリプト。  
`.claude/settings.json` の `statusLine` から呼び出されます。

### Permissions

ローカルの権限設定は `.claude/settings.local.json`（`.gitignore` 対象・個人環境用）が正典です。現在の許可コマンド例（`.claude/settings.local.json` の `permissions.allow`）:

- `Bash(curl -s --max-time 5 http://backend:8080/actuator/health)`：ヘルスチェック確認
- `WebFetch(domain:github.com)`：GitHub ページの参照
- `WebSearch`：Web 検索

実際の設定値は `.claude/settings.local.json` を直接参照してください（個人環境で異なる場合があります）。

### 言語・モデル設定 {#model-settings}
`.claude/settings.json` で定義されています。

| 設定 | 値 |
|-----|---|
| `language` | japanese |
| `model` | sonnet |
| `advisorModel` | opus |
| `autoUpdatesChannel` | latest |
| `theme` | auto |

`model: sonnet` は対話セッションの既定モデルを Sonnet に固定する設定です。日常的な実装・修正では Sonnet を基本として使う方針（[ai-tools-guide.md §モデルの選択と使用量の管理](../../learn/ai-tools-guide.md#model-and-usage)）を、リポジトリ設定として反映しています。`advisorModel` はこの既定とは独立しており、`advisor` ツール専用に Opus を指定するものです。
