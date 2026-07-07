---
type: state
title: AI-DLC State Tracking
description: AI-DLC エンジンが管理する開発フェーズの進捗トラッカー（INCEPTION/CONSTRUCTION/OPERATIONS）
tags:
  - ai-dlc
  - state
  - tracking
timestamp: 2026-07-07
---

# AI-DLC State Tracking

> このファイルは AI-DLC エンジン（`.claude/skills/aidlc/SKILL.md`、`/aidlc` スキル）が管理する進捗トラッカー。
> 上流の `aidlc-docs/aidlc-state.md` に相当（BookFlow 翻案：`Docs/spec/aidlc-state.md`）。
> エンジン動作中は自動更新される。新規プロジェクト開始前にこのテンプレートをリセットして使う。

## Project Information

- **Project Type**: [Greenfield/Brownfield]
- **Start Date**: [ISO 8601 timestamp]
- **Current Stage**: [INCEPTION - Workspace Detection]
- **Workspace Root**: /workspace

## Code Location Rules

- **Application Code**: Workspace root（`Docs/spec/aidlc-docs/` には置かない）
- **Documentation**: `Docs/spec/aidlc-docs/` のみ
- **State/Audit**: `Docs/spec/aidlc-state.md`（このファイル）、`Docs/spec/aidlc-audit.md`

## Extension Configuration

| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | — | — |
| Resiliency Baseline | — | — |
| Property-Based Testing | — | — |

## Stage Progress

### INCEPTION PHASE

- [ ] Workspace Detection
- [ ] Reverse Engineering（Brownfield の場合）
- [ ] Requirements Analysis
- [ ] User Stories（条件付き）
- [ ] Workflow Planning
- [ ] Application Design（条件付き）
- [ ] Units Generation（条件付き）

### CONSTRUCTION PHASE

- [ ] Functional Design（条件付き、ユニット別）
- [ ] NFR Requirements（条件付き、ユニット別）
- [ ] NFR Design（条件付き、ユニット別）
- [ ] Infrastructure Design（条件付き、ユニット別）
- [ ] Code Generation（必須、ユニット別）
- [ ] Build and Test（必須）

### OPERATIONS PHASE

- [ ] Operations（プレースホルダー）

## Current Status

- **Lifecycle Phase**: [INCEPTION/CONSTRUCTION/OPERATIONS]
- **Current Stage**: [Stage Name]
- **Next Stage**: [Next stage to execute]
- **Status**: [In Progress/Complete/Waiting for Approval]
