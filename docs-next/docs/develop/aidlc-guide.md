---
sidebar_position: 2
title: AI-DLC ガイド
description: AI-DLC エンジン（3 フェーズ・plan-first ゲート）の仕組みと BookFlow での位置づけ
tags:
  - guide
  - ai-dlc
audience: 学習者
references:
  - ./dev-workflow.md
  - ../aidlc-adoption.md
last_updated: '2026-08-11T00:00:00+09:00'
---

# AI-DLC ガイド

このガイドは、[標準開発フロー](./dev-workflow.md#flow) の計画立案・実装段階を支える **AI-DLC エンジン** の仕組みを説明します。実際の開発手順は [開発ワークフローガイド](./dev-workflow.md) を参照してください。

AI-DLC は AWS Labs の **AI Development Life Cycle**（[`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)）で、Inception（WHAT/WHY）・Construction（HOW）・Operations の3フェーズと、各ステージでの承認ゲートを柱とする開発方法論です。  
BookFlow ではこのエンジン（`.claude/skills/aidlc/SKILL.md`）を **標準ワークフローとして採用**しています。エンジンは `/aidlc` の明示起動、または「AI-DLC で進めて」等の意図指定があったときにのみ発動し、指定のない小修正・質問では発動しません。

---

## 3フェーズの概要

### INCEPTION フェーズ（WHAT/WHY）
![INCEPTION フェーズ](/diagrams/guide/dev-workflow-inception.drawio.svg)

`/aidlc` 起動後、通常（agent）モードのままワークスペース分析・要件分析を行い、実行計画（Workflow Planning）を提示します。学習者が計画に納得したことをチャットで示すと、Construction フェーズに進みます。

### CONSTRUCTION フェーズ（HOW）
![CONSTRUCTION フェーズ](/diagrams/guide/dev-workflow-construction.drawio.svg)

Workflow Planning で決定した設計ステージを必要な範囲だけ実行し、コード生成・ビルドとテストへ進みます。各ステージは変更内容に応じて実行/スキップが判断されます。

### OPERATIONS フェーズ

実体は CI 品質ゲート（`CI Frontend` / `CI Backend`）です。将来のデプロイ自動化、監視は別タスクで扱います。

各ステージの実行条件や役割、BookFlow での翻案状況まで含めた一覧は [AI-DLC 採用台帳](../aidlc-adoption.md) を参照してください。

---

## plan-first のセルフ承認 \{#plan-first}

AI-DLC の中核は、実装より先に計画を立てて学習者自身が納得してから進める **plan-first** の考え方です。`/aidlc` を起動すると、エンジンが Workflow Planning で実行計画を提示し、学習者がその内容に納得したことをチャットで示してから実装に進みます。計画に問題があればこの段階で修正します。運営者の承認は不要です。

状態管理ファイル（`aidlc-state.md`、`audit.md` 等）の BookFlow での写像先は [AI-DLC 採用台帳 §状態管理の写像](../aidlc-adoption.md) を参照してください。

---

## AI-DLC エンジンの活用参照

- **エンジン本体**: `.claude/skills/aidlc/SKILL.md`（`/aidlc` スキル）、`vendor/aidlc-rules/aws-aidlc-rules/core-workflow.md`（上流原本）
- **起動判断のポインタ**: `.claude/rules/aidlc-core.md`（常時読込。`/aidlc` を起動すべきかどうかの判断のみを担う薄いファイル）
- **ステージ詳細**: `.aidlc-rule-details/<phase>/<stage>.md`（BookFlow 翻案済み）
- **進捗トラッカー**: `Docs/spec/aidlc-state.md`
- **監査ログ**: `Docs/spec/aidlc-audit.md`
- **採用台帳**: `Docs/spec/aidlc-adoption.md`
