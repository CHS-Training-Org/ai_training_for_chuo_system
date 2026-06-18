---
name: aidlc-core
description: BookFlow の標準開発ワークフロー（AI-DLC エンジン）。ソフトウェア開発要求に対して INCEPTION → CONSTRUCTION → OPERATIONS の3フェーズを駆動する。元ファイル: vendor/aidlc-rules/aws-aidlc-rules/core-workflow.md（固定コミット b19c81928bdf1b8d13856f462fcf2ede1720b4cb、VERSION 0.1.8）。BookFlow 向け翻案: aidlc-docs/ → Docs/spec/aidlc-docs/、aidlc-state.md → Docs/spec/aidlc-state.md、audit.md → Docs/spec/aidlc-audit.md、OVERRIDES 宣言 → plan mode 第1ゲートと統合。
---

# BookFlow 標準開発ワークフロー（AI-DLC エンジン）

> **元ファイル**: `vendor/aidlc-rules/aws-aidlc-rules/core-workflow.md`（固定コミット `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`、VERSION 0.1.8）
> **BookFlow 翻案**: `Docs/spec/aidlc-adoption.md` 参照

## BookFlow 統合ノート

- **ワークフロー発動**: このルールは Claude Code の **plan mode** 経由で発動する。ソフトウェア開発要求が来たら、まず plan mode に切り替え、このワークフローに従って計画を立ててからメンター承認（第1ゲート）を得る。
- **ルール解決パス**: `.aidlc-rule-details/`（ワークスペースルートに配置、BookFlow 翻案済みステージファイルが入っている）
- **状態ファイル**: `Docs/spec/aidlc-state.md` を使う（上流 `aidlc-docs/aidlc-state.md` に相当）
- **監査ログ**: `Docs/spec/aidlc-audit.md` を使う（上流 `aidlc-docs/audit.md` に相当・追記専用）
- **設計成果物**: `Docs/spec/aidlc-docs/` 配下に生成する（既存の `Docs/spec/requirements.md` 等はエンジン完了後に統合する）
- **OVERRIDES 宣言**: 上流の "OVERRIDES all other built-in workflows" は BookFlow では「plan mode での第1ゲート承認を必須とするソフトウェア開発の標準フロー」として読み替える。既存スキル（`/update-spec`、`/draft-pr`）はエンジンのステージと補完関係にある。
- **AGENTS.md**: 非採用（Claude Code 専一）。

## Adaptive Workflow Principle

The workflow adapts to the work, not the other way around. The AI model intelligently assesses what stages are needed based on: user intent, existing codebase state, complexity and scope, risk and impact.

## MANDATORY: Rule Details Loading

**CRITICAL**: When performing any phase, read relevant content from rule detail files. Check these paths in order (first match wins):
- `.aidlc-rule-details/` （BookFlow 標準。ワークスペースルートに存在する）
- `.aidlc/aidlc-rules/aws-aidlc-rule-details/`
- `.kiro/aws-aidlc-rule-details/`
- `.amazonq/aws-aidlc-rule-details/`

All subsequent rule detail file references are relative to the resolved directory.

**Common Rules** — ALWAYS load at workflow start:
- `common/process-overview.md`
- `common/session-continuity.md`
- `common/content-validation.md`
- `common/question-format-guide.md`

## MANDATORY: Extensions Loading

At workflow start, scan `extensions/` recursively and load ONLY `*.opt-in.md` files. Full rule files are loaded on-demand after user opts in during Requirements Analysis. Before enforcing any extension, check its `Enabled` status in `Docs/spec/aidlc-state.md`.

## MANDATORY: Content Validation

Before creating ANY file, validate per `common/content-validation.md` (Mermaid syntax, ASCII diagrams, special characters).

## MANDATORY: Question File Format

Follow `common/question-format-guide.md`. BookFlow では `AskUserQuestion` ツールも併用可（4問以内・互いに排他的）。

## MANDATORY: Custom Welcome Message

When starting a NEW workflow, load and display `common/welcome-message.md` ONCE.

---

# INCEPTION PHASE

**Purpose**: Planning, requirements gathering, and architectural decisions. Determine WHAT to build and WHY.

**Stages**: Workspace Detection (ALWAYS) → Reverse Engineering (CONDITIONAL) → Requirements Analysis (ALWAYS) → User Stories (CONDITIONAL) → Workflow Planning (ALWAYS) → Application Design (CONDITIONAL) → Units Generation (CONDITIONAL)

---

## Workspace Detection (ALWAYS EXECUTE)

1. **MANDATORY**: Log initial user request in `Docs/spec/aidlc-audit.md`
2. Load `inception/workspace-detection.md`
3. Check for existing `Docs/spec/aidlc-state.md` (resume if found); scan workspace; determine brownfield/greenfield; check for existing RE artifacts in `Docs/spec/aidlc-docs/inception/`
4. Determine next: RE (brownfield + no artifacts) OR Requirements Analysis
5. **MANDATORY**: Log findings in `Docs/spec/aidlc-audit.md`
6. Present completion message; automatically proceed to next phase

## Reverse Engineering (CONDITIONAL — Brownfield Only)

**Execute IF**: Existing codebase detected AND no previous RE artifacts in `Docs/spec/aidlc-docs/inception/reverse-engineering/`

1. **MANDATORY**: Log start in `Docs/spec/aidlc-audit.md`
2. Load `inception/reverse-engineering.md`
3. Execute (business overview, architecture, code structure, API, component inventory, tech stack, dependencies)
4. **Wait for Explicit Approval** — DO NOT PROCEED until user confirms
5. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

## Requirements Analysis (ALWAYS EXECUTE — Adaptive Depth)

Depth: Minimal / Standard / Comprehensive based on request clarity and complexity.

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `inception/requirements-analysis.md`
3. Execute (load RE artifacts if brownfield, analyze request, determine depth, generate requirements document)
4. **Wait for Explicit Approval** — DO NOT PROCEED until user confirms
5. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

## User Stories (CONDITIONAL)

**ALWAYS Execute IF**: New user-facing features, user workflow changes, multiple personas, complex business requirements, cross-functional collaboration, customer-facing API.

**SKIP ONLY IF**: Pure internal refactoring, simple isolated bug fixes, infrastructure-only changes, documentation-only.

Two parts: Part 1 (Planning: story plan + questions + approval), Part 2 (Generation: execute plan).

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `inception/user-stories.md`
3. Execute intelligent assessment → Part 1 → Part 2
4. **Wait for Explicit Approval**
5. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

## Workflow Planning (ALWAYS EXECUTE)

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `inception/workflow-planning.md` and `common/content-validation.md`
3. Load all prior context (RE, requirements, stories); determine phases and depth; generate workflow visualization (VALIDATE Mermaid)
4. **Wait for Explicit Approval** — emphasize user control to override recommendations
5. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

## Application Design (CONDITIONAL)

**Execute IF**: New components/services, component methods definition, service layer design needed

**Skip IF**: Changes within existing boundaries, no new components, pure implementation

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `inception/application-design.md`
3. Execute at appropriate depth
4. **Wait for Explicit Approval**
5. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

## Units Generation (CONDITIONAL)

**Execute IF**: System needs multi-unit decomposition, multiple services, complex breakdown

**Skip IF**: Single simple unit, no decomposition needed

Two parts: Part 1 (Planning), Part 2 (Generation).

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `inception/units-generation.md`
3. Execute Parts 1 and 2
4. **Wait for Explicit Approval**
5. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

---

# CONSTRUCTION PHASE

**Purpose**: Detailed design, NFR implementation, and code generation. Determine HOW to build it.

**Per-Unit Loop** (each unit completed fully before moving to next unit).

After all units: Build and Test (ALWAYS).

---

## Per-Unit Loop

### Functional Design (CONDITIONAL)

**Execute IF**: New data models, complex business logic, business rules need detailed design

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `construction/functional-design.md`
3. Execute functional design for this unit
4. **MANDATORY**: Present standardized **2-option** completion message (Request Changes / Continue) — DO NOT use 3-option or emergent behavior
5. **Wait for Explicit Approval**
6. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

### NFR Requirements (CONDITIONAL)

**Execute IF**: Performance requirements, security considerations, scalability concerns, tech stack selection

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `construction/nfr-requirements.md`
3. Execute NFR assessment
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**
6. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

### NFR Design (CONDITIONAL)

**Execute IF**: NFR Requirements was executed

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `construction/nfr-design.md`
3. Execute NFR design
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**
6. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

### Infrastructure Design (CONDITIONAL)

**Execute IF**: Infrastructure mapping, deployment architecture, cloud resources specification

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `construction/infrastructure-design.md`
3. Execute infrastructure design
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**
6. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

### Code Generation (ALWAYS EXECUTE, per-unit)

Two parts: Part 1 (Planning: numbered steps + checkboxes + approval), Part 2 (Generation: execute plan).

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `construction/code-generation.md`
3. Part 1: Create plan → get approval; Part 2: Execute plan
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**
6. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

---

## Build and Test (ALWAYS EXECUTE)

1. **MANDATORY**: Log user input in `Docs/spec/aidlc-audit.md`
2. Load `construction/build-and-test.md`
3. Generate comprehensive build and test instructions (build, unit test, integration test, performance test as applicable)
4. Create instruction files in `Docs/spec/aidlc-docs/construction/build-and-test/`
5. **Wait for Explicit Approval**: "Build and test instructions complete. Ready to proceed to Operations stage?"
6. **MANDATORY**: Log response in `Docs/spec/aidlc-audit.md`

---

# OPERATIONS PHASE

**Status**: Placeholder for future deployment and monitoring workflows. All build/test activities are in CONSTRUCTION phase.

---

## Key Principles

- **Adaptive Execution**: Only execute stages that add value
- **Transparent Planning**: Always show execution plan before starting
- **User Control**: User can request stage inclusion/exclusion
- **Progress Tracking**: Update `Docs/spec/aidlc-state.md` with executed and skipped stages
- **Complete Audit Trail**: Log ALL user inputs and AI responses in `Docs/spec/aidlc-audit.md` with ISO 8601 timestamps. Capture COMPLETE RAW INPUT. ALWAYS APPEND — never overwrite.
- **NO EMERGENT BEHAVIOR**: Construction phases MUST use standardized 2-option completion messages

## MANDATORY: Plan-Level Checkbox Enforcement

1. NEVER complete work without updating plan checkboxes
2. IMMEDIATELY after completing ANY step, mark that step [x]
3. This must happen in the SAME interaction where work is completed

### Two-Level Checkbox Tracking
- **Plan-Level**: Detailed execution progress within each stage (plan documents)
- **Stage-Level**: Overall workflow progress in `Docs/spec/aidlc-state.md`

## Audit Log Format

```markdown
## [Stage Name or Interaction Type]
**Timestamp**: [ISO 8601 timestamp]
**User Input**: "[Complete raw user input — never summarized]"
**AI Response**: "[AI's response or action taken]"
**Context**: [Stage, action, or decision made]

---
```

**CORRECT**: Read `Docs/spec/aidlc-audit.md` → Append/Edit to add new entries

**WRONG**: Read → Completely overwrite with old contents + new entries (this corrupts audit history)

## Directory Structure（BookFlow 翻案版）

```text
<WORKSPACE-ROOT>/
├── [BookFlow project structure]          # アプリケーションコードはここ
│
├── Docs/spec/                            # ドキュメント（真実の源）
│   ├── requirements.md                   # 要件定義（エンジン成果を統合）
│   ├── screen-spec.md                    # 画面仕様（同上）
│   ├── api-spec.md                       # API仕様（同上）
│   ├── er-diagram.md                     # ER図（同上）
│   ├── aidlc-state.md                    # AI-DLC 進捗トラッカー
│   ├── aidlc-audit.md                    # AI-DLC 監査ログ（追記専用）
│   └── aidlc-docs/                       # AI-DLC 作業用ドキュメント
│       ├── inception/
│       │   ├── plans/
│       │   ├── reverse-engineering/
│       │   ├── requirements/
│       │   ├── user-stories/
│       │   └── application-design/
│       ├── construction/
│       │   ├── plans/
│       │   └── {unit-name}/
│       └── operations/
│
└── .aidlc-rule-details/                  # BookFlow 翻案済みステージファイル
    ├── common/
    ├── inception/
    ├── construction/
    ├── operations/
    └── extensions/
```

**CRITICAL**: アプリケーションコードは Workspace root（`Docs/spec/aidlc-docs/` には置かない）
