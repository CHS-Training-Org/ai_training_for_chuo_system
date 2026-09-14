---
type: design
title: Round 2 実行計画（PR #113 観点2 テストギャップ対応）
description: Issue #29 CSV帳票出力の追加ラウンド。実行するステージ・スキップするステージとその根拠
tags:
  - ai-dlc
  - workflow-planning
  - csv-export
timestamp: 2026-09-14
---

# Round 2 実行計画

## Detailed Analysis Summary

### Change Impact Assessment

- **User-facing changes**: No（テスト追加のみ、UI・API挙動は無変更）
- **Structural changes**: No（新規コンポーネント・新規ファイル構成の変更なし。新規テストファイル2つを追加するのみ）
- **Data model changes**: No
- **API changes**: No
- **NFR impact**: No

### Component Relationships

- **Primary Component**: `frontend/src/lib/api-client.ts`（`getRaw`）、`frontend/src/app/api/reports/reservations/csv/route.ts`
- **Supporting Components**: `frontend/tests/unit/msw/handlers.ts`（変更なし。テスト単位の`server.use`のみ使用）、`frontend/tests/unit/server/actions/*.test.ts`（セッションモックの規約を踏襲）

### Risk Assessment

- **Risk Level**: Low（テスト追加のみ、プロダクションコードは無変更）
- **Rollback Complexity**: Easy（テストファイルの削除のみで復元可能）
- **Testing Complexity**: Simple

## Workflow Visualization

```mermaid
flowchart TD
    Start(["Round 2 Request: PR #113 review NG resolution"])

    subgraph INCEPTION["INCEPTION PHASE"]
        WD["Workspace Detection<br/>COMPLETED"]
        RA["Requirements Analysis<br/>COMPLETED (Minimal)"]
        US["User Stories<br/>SKIP"]
        WP["Workflow Planning<br/>COMPLETED"]
        AD["Application Design<br/>SKIP"]
        UG["Units Generation<br/>SKIP"]
    end

    subgraph CONSTRUCTION["CONSTRUCTION PHASE"]
        FD["Functional Design<br/>SKIP"]
        NFRA["NFR Requirements<br/>SKIP"]
        NFRD["NFR Design<br/>SKIP"]
        ID["Infrastructure Design<br/>SKIP"]
        CG["Code Generation<br/>EXECUTE"]
        BT["Build and Test<br/>EXECUTE"]
    end

    Start --> WD
    WD --> RA
    RA --> WP
    WP --> CG
    CG --> BT
    BT --> End(["Round 2 Complete"])

    style WD fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RA fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style WP fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style CG fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style BT fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style US fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style AD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style UG fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style FD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRA fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style ID fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style INCEPTION fill:#BBDEFB,stroke:#1565C0,stroke-width:3px,color:#000
    style CONSTRUCTION fill:#C8E6C9,stroke:#2E7D32,stroke-width:3px,color:#000
    style Start fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000
    style End fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000

    linkStyle default stroke:#333,stroke-width:2px
```

## Phases to Execute

### INCEPTION PHASE

- [x] Workspace Detection (COMPLETED) — 既存ユニットcsv-exportの継続作業のため再検出不要
- [x] Requirements Analysis (COMPLETED, Minimal) — `round2-test-gap-requirements.md`
- [x] User Stories — SKIP（既存挙動の検証のみ。新規ユーザー体験・ペルソナなし）
- [x] Workflow Planning (COMPLETED) — 本ファイル
- [ ] Application Design — SKIP
  - **Rationale**: 新規コンポーネント・新規サービス層なし
- [ ] Units Generation — SKIP
  - **Rationale**: 既存ユニット `csv-export` の範囲内。新規データモデル・新規APIなし

### CONSTRUCTION PHASE

- [ ] Functional Design — SKIP
  - **Rationale**: 新規ビジネスロジックの設計は不要（既存実装の挙動を固定するテストのみ）
- [ ] NFR Requirements — SKIP
  - **Rationale**: 性能・セキュリティ等の新規非機能要件なし
- [ ] NFR Design — SKIP
  - **Rationale**: NFR Requirements未実行のため連動SKIP
- [ ] Infrastructure Design — SKIP
  - **Rationale**: インフラ変更なし
- [ ] Code Generation — EXECUTE (ALWAYS)
  - **Rationale**: `api-client.ts`（`getRaw`）用テストファイル・`route.ts` 用テストファイルの新規作成
- [ ] Build and Test — EXECUTE (ALWAYS)
  - **Rationale**: `pnpm test`（新規テスト含む全体）・`pnpm lint`・`pnpm format:check` で検証

## 対象ファイル（Code Generationで新規作成予定）

- `frontend/tests/unit/lib/api-client.test.ts`（新規）
- `frontend/tests/unit/app/api/reports/reservations/csv/route.test.ts`（新規）

## Success Criteria

- **Primary Goal**: PR #113 観点2 NGで指摘された2つのテストギャップを解消する
- **Key Deliverables**: 上記2テストファイルの新規追加。`getRaw`を消す/`route.ts`を壊すと新規テストが失敗することを確認（レビューコメントの「判断の根拠」を裏返す）
- **Quality Gates**: `pnpm test` 全件成功、`pnpm lint`・`pnpm format:check` 成功
