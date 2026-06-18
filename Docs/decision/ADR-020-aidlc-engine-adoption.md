---
type: adr
title: ADR-020 — AI-DLC エンジン完全採用（PHASE4 タスク 3.7 採用方針転換）
description: AI-DLC エンジン（awslabs/aidlc-workflows）を BookFlow の標準開発ワークフローとして完全採用した判断の記録
tags: [ai-dlc, workflow, aidlc, vendor]
timestamp: 2026-06-18
---

# ADR-020 — AI-DLC エンジン完全採用（PHASE4 タスク 3.7 採用方針転換）

## Status

Accepted（2026-06-18）

## Context

BookFlow は PHASE4 タスク 3.7（2026-06-14 完了）において、AI-DLC（[`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows)、固定コミット `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`、VERSION 0.1.8）の **`common/` 11 ファイルのみ**を取り込み、「案B改良（vendoring＋再構成＋台帳）」を採用した。この方針では：

- `aidlc-docs/` 並行成果物ツリーを作らない
- AI-DLC ワークフローエンジン（`aidlc-state.md` / `audit.md` / units of work / `core-workflow.md`）は**非採用**
- AI-DLC を「思考モデル」として写像するにとどめる

その後、「**上流の全スキル（common + inception + construction + operations + extensions + `core-workflow.md`）を BookFlow の開発フローに取り込みたい**」という要望が生まれ、以下の方針が確定した：

- **既存フローとの関係＝置き換え（replace）**: AI-DLC エンジンを BookFlow の標準ワークフローとして教える
- **状態管理＝Docs/spec/ に写像統合**: `aidlc-docs/` 並行ツリーは作らず、`Docs/spec/` 内の単一ファイルと写像

## Decision

**AI-DLC エンジン完全採用（replace + Docs/spec/ 写像統合）** を採用する。

具体的な変更：

1. **vendoring 拡張**（`vendor/aidlc-rules/`）：上流の全フォルダ（inception / construction / operations / extensions / `aws-aidlc-rules/core-workflow.md`）を固定コミットで逐語コピー（32 ファイル）
2. **エンジン活性化**（`.claude/rules/aidlc-core.md`）：`core-workflow.md` の BookFlow 翻案版。状態ファイルパスを `Docs/spec/` に写像
3. **翻案済みステージファイル**（`.aidlc-rule-details/`）：全 31 ステージファイルを `aidlc-docs/` → `Docs/spec/aidlc-docs/` にパス翻案
4. **状態管理写像**：
   - `aidlc-docs/aidlc-state.md` → `Docs/spec/aidlc-state.md`（単一ファイル・ツリー新設なし）
   - `aidlc-docs/audit.md` → `Docs/spec/aidlc-audit.md`（単一ファイル・追記専用）
5. **標準フロー文書の全面改訂**（`Docs/guide/dev-workflow.md`）：エンジンの 3 フェーズ・全ステージ・ゲートを BookFlow 標準として記述
6. **採用台帳の全面改訂**（`Docs/spec/aidlc-adoption.md`）：上流 32 ファイル全カバレッジ

これまで「非該当」だった 5 ファイル（`error-handling` / `session-continuity` / `terminology` / `welcome-message` / `workflow-changes`）はエンジン導入により前提（`aidlc-state.md` / `audit.md`）が揃ったため「エンジン採用（翻案・活性化）」に変更。

## Consequences

**ポジティブ**:
- BookFlow が「AI-DLC エンジンを実際に駆動して開発を進める学習リポジトリ」になる
- 学習者が AI-DLC の全 3 フェーズ・ステージ・承認ゲートを実体験できる
- 採用台帳が上流 100% カバレッジを表現する
- `session-continuity.md` によるセッション復元機構が機能する
- extensions（security / resiliency / property-based testing）が使えるようになる

**留意点**:
- BookFlow の学習対象がエンジン中心になるため、既存の学習コンテンツ（curriculum.md の STEP 等）との整合確認が必要
- `Docs/spec/aidlc-docs/` は作業用ディレクトリであり、`.gitignore` への追加を検討する（開発中の一時成果物が含まれる）
- 状態結合 3 ファイル（`session-continuity` / `workflow-changes` / `error-handling`）は `Docs/spec/aidlc-state.md` 写像先に合わせて翻案済み
- 上流同期時は `vendor/aidlc-rules/`（凍結）と `.aidlc-rule-details/`（翻案済み活性資産）の両方を更新する

## 旧決定との関係

PHASE4 タスク 3.7 の「案B改良（写像のみ・エンジン非採用）」を **supersede** する。旧方針の記録は `Docs/plan/PHASE4_AI_DRIVEN_DEV_TASKS.md`（タスク 3.7）と `Docs/plan/aidlc-overview.html`（検討資料）に保存する。

`AGENTS.md` 非採用（タスク 2.2 決定）はこの ADR の対象外（Claude Code 専一を維持）。
