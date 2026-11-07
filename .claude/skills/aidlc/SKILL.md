---
name: aidlc
description: AI-DLC ワークフロー（INCEPTION→CONSTRUCTION→OPERATIONS、per-stage 承認ゲート・監査ログ・成果物生成）でソフトウェア開発を駆動する。「AI-DLC で進めて」「ai-dlc のワークフローで開発したい」「aidlc を使って◯◯を実装して」等の指定時、または `/aidlc` 明示起動時に使う。AI-DLC 指定のない小修正・質問・ドキュメント更新のみでは使わない（誤発火抑制）。元ファイル: vendor/aidlc-rules/aws-aidlc-rules/core-workflow.md（固定コミット b19c81928bdf1b8d13856f462fcf2ede1720b4cb、VERSION 0.1.8）。
---

# BookFlow AI-DLC エンジン（`/aidlc` スキル）

> **移設経緯**: AI-DLC エンジン本体は `.claude/rules/aidlc-core.md`（常時読込・soft 委譲）から、このスキルに移設した。移設理由は (a) 発火の確定性（明示・意図ベース起動）、(b) 常時読込コンテキストの軽量化、(c) 硬い per-stage 意味論の保持。詳細は `docs-next/docs/reference/adr/ADR-020-aidlc-engine-adoption.md`（2026-06-24 追記）を参照。
> **BookFlow 翻案**: `docs-next/docs/reference/aidlc/adoption.md` 参照

## Pre-flight（BookFlow 独自）: 対象タスクの特定とブランチ確認

**この節は上流 AI-DLC エンジンの一部ではない。** `/aidlc` が呼ばれた瞬間、次節のエンジン起動より前に一度だけ実行する BookFlow 独自の前置き処理である。承認ゲート・成果物生成の対象外であり、この節の判断を `Docs/spec/aidlc-audit.md` に記録する必要はない（下記 C の初期化では監査ログそのものをテンプレートに戻す）。Workspace Detection（`.aidlc-rule-details/inception/workspace-detection.md`）は、この節の判定と整合するよう Step 1 と Step 4 だけを翻案している。

1. `Docs/spec/aidlc-state.md` を読み、中身で次の 3 つに分ける。ファイルがあるかどうかだけでは判断しない（`main` にも学習者のトランクにもこのファイルは常にあり、存在だけで判断すると前の課題の記録を「再開」してしまうため。Issue #160）。
   - **新規**：ファイルが無い、またはテンプレートのまま（Stage Progress のチェックがすべて `[ ]` で、Current Status の Status がプレースホルダー `[In Progress/Complete/Waiting for Approval]` のまま）。→ 手順 2 に進む。
   - **前の作業の記録**：次のいずれか。→ 下記「C. 前の作業の記録の初期化」に進む。
     - Project Information に対象タスクの欄（`Target Branch`・`Target Enhancement Sheet`）が無い古い形式（テンプレートのままのものは新規。`main` の `Docs/spec/aidlc-state.md` にはこの欄が無い。本文から課題を推測しない。確認で「再開」を選べるため、作業中でも害はない）
     - 対象タスクが現在のブランチと一致しない
     - Status が完了を表している（`Complete` に限らず「完了」「全ステージ完了」などの書き方を含む）
   - **作業中**：上記のどちらでもない（対象タスクが現在のブランチと一致し、完了していない）。→ 既存ワークフローの再開（レジューム）とみなし、この節はスキップして次節（エンジン起動）に進む。
2. 新規と判定した場合（C で初期化した場合を含む）、現在の git ブランチを確認する。
   - **C で初期化し、現在のブランチが初期化前の記録の `Target Branch` と同じ**（前の課題のブランチに乗ったまま起動した場合）：前の課題を新しい作業の対象として採用しないよう、規約に合致していても質問なしでは採用しない。現在のブランチ名と前の課題であることを示し、下記 A → B の順に進める。
   - **`feature/<GitHubユーザー名>/<issue番号>-<short-desc>` 規約に既に合致**：`docs-next/docs/develop/dev-workflow.md` 手順2で作成済みのケースなので、ブランチ操作は行わない。**質問はせず**、ブランチ名の `<short-desc>` をそのまま対象タスクの識別子として採用する（`docs-next/docs/spec/enhancements/*/<short-desc>.md` が存在すればそれが対象シート。難易度のディレクトリ（`beginner/` `intermediate/` `advanced/`）を 1 段挟むため、直下ではなくグロブで探す。存在しなければエンハンス課題以外のタスクとみなす）。次節に進む。
   - **`main`・`master`、または学習者のトランク（`learner/<GitHubユーザー名>/main`）上にいる**：下記「A. 対象タスクの特定」→「B. ブランチの作成」の順に進める（トランクは PR の宛先であり、直接作業しない）。
   - **上記のどれでもない**（別の作業ブランチに乗ったまま起動した場合）：現在のブランチ名を明示したうえで「このまま続ける」か「新しく feature ブランチを作成する」かを `AskUserQuestion` で確認する。「このまま続ける」場合はブランチ名が規約に合致していれば上記と同様に `<short-desc>` を抽出し（合致していなければエンハンス課題以外のタスクとみなし）次節に進む。「新しく作成する」場合は下記 A → B に従う。
3. ブランチの作成・切り替えは `git checkout -b` のみを使う。既存の変更を破棄する操作（`git reset --hard` 等）は行わない。
4. 新規として進める場合、確定した対象タスク（ブランチ名と対象シートのパス。シートが無ければ「なし」）を、エンジンが Workspace Detection で `Docs/spec/aidlc-state.md` を作成するときに Project Information の `Target Branch`・`Target Enhancement Sheet` へ記入する。次回の起動時は、この欄と現在のブランチを比べて手順 1 の判定を行う。

### A. 対象タスクの特定

- 特別な指示がない限り、`/aidlc` が扱うタスクは `docs-next/docs/spec/enhancements/` 配下のビジネス要求シート（`docs-next/docs/spec/enhancements/index.md` の課題一覧）を既定の対象とみなす。
- ユーザーの発言（シートのファイル名・課題名の明示、既存の Issue 番号、これまでの会話文脈）から対象シートを一意に特定できる場合は、そのまま採用する（改めて聞き直さない）。
- 特定できず、かつメンター指定のバグ修正・運用タスク等エンハンス課題以外であることが会話から明らかでない場合は、`docs-next/docs/spec/enhancements/index.md` の課題一覧を提示し `AskUserQuestion` でどの課題に取り組むか確認する（選択肢に「該当なし（エンハンス課題以外のタスク）」を含める）。
- 「該当なし」が選ばれた場合、または最初からエンハンス課題以外であることが明らかな場合は、以降の short-desc・Issue 番号の自動特定を行わない（下記 B の非特定時フォールバックに進む）。

### B. ブランチの作成

- **対象エンハンス課題を特定できている場合**：
  1. short-desc は対象シートのファイル名（拡張子を除く）をそのまま使う。
  2. GitHub ユーザー名は `gh api user -q .login` で取得する（取得できない場合のみユーザーに確認する）。
  3. `gh auth status` が成功する場合に限り、`gh issue list --state open --search "in:body <short-desc>"` 等で候補を取得し、本文に `<short-desc>.md` の文字列を含む Issue に絞り込んで番号の一意特定を試みる。`gh` が使えない場合・絞り込み後に複数件残った場合・該当なしの場合は、Issue 番号をユーザーに確認する（未起票なら `/create-issue` で先に起票するよう案内する）。
  4. 組み立てたブランチ名 `feature/<user>/<issue番号>-<short-desc>` を `AskUserQuestion` で提示し、「提案通り作成」または自由記述での修正を確認してから `git checkout -b` を実行する。
- **対象エンハンス課題を特定できていない場合**：従来どおり Issue 番号と短い説明をユーザーに確認し、`git checkout -b feature/<user>/<issue>-<desc>` を実行する。

### C. 前の作業の記録の初期化

前の課題（例：STEP-04）の PR をトランクへマージすると、完了した進捗トラッカー・監査ログ・設計成果物もトランクに入り、次の課題のブランチへ引き継がれる。上流 AI-DLC（v1 系。`core-workflow.md` と `workspace-detection.md` は取り込み元の 0.1.8 と同一）は 1 つのワークスペースで 1 つの作業を最初から進める前提で、同じワークスペースで次の作業を始める手順を持たない。BookFlow では、次の作業を新規として始めるために記録を初期化する。前の作業の記録は、その作業の PR とコミット履歴に残る。監査ログの「追記専用」はワークフロー実行中の規律であり、次の作業を始める前の初期化はその対象ではない（運営による初期化の前例：コミット `88a378c2`）。

1. 記録に書かれた対象タスク（分かる範囲で）と Status を示し、「新しい作業として始める（記録を初期化する）」か「前の作業を再開する」かを `AskUserQuestion` で確認する。「再開する」が選ばれた場合は、`Target Branch`・`Target Enhancement Sheet` を現在のブランチと対象シートで記入（欄が無ければ Project Information に追加）してから、この節を抜けて次節（エンジン起動）に進む。記入しておかないと、次回の起動でも同じ確認が出る。
2. `git status --porcelain -- Docs/spec/aidlc-state.md Docs/spec/aidlc-audit.md Docs/spec/aidlc-docs/` で未コミットの変更を確認する（追跡していないファイルも出る）。変更がある場合は、変更のあるファイルを示し、「初期化をやめ、前の作業の記録をコミットしてから `/aidlc` を起動し直す」か「変更を破棄して初期化する」かを `AskUserQuestion` で確認する。前者は記録を残したい場合、後者は誤って前の作業を再開してしまった変更など、残す必要がない場合に選ぶ。前者なら止める。後者なら手順 3 に進む（手順 3 の上書きと削除で変更は破棄される）。
3. 初期化前の `Target Branch` を控えたうえで（Pre-flight の手順 2 の判定で使う）、次の 3 つを行う。
   - `.claude/skills/aidlc/templates/aidlc-state.md` を `Docs/spec/aidlc-state.md` に上書きコピーする
   - `.claude/skills/aidlc/templates/aidlc-audit.md` を `Docs/spec/aidlc-audit.md` に上書きコピーする
   - `Docs/spec/aidlc-docs/` を削除する
4. 初期化したことと、前の作業の記録は PR とコミット履歴に残っていることを学習者に伝える。あわせて、設計成果物を削除したので Workspace Detection の後に既存コードの解析（Reverse Engineering）がもう一度行われること、初期化による変更は新しい作業の実装とは別のコミット（例：`chore: 前の作業の AI-DLC 記録を初期化する`）に分けるとよいことを伝える。コミットは学習者に任せ、ここでは行わない。そのうえで Pre-flight の手順 2（新規）に進む。

## このスキルの起動 = AI-DLC エンジン開始

このスキルが呼ばれた瞬間からエンジンが起動する。**起動後は下記のすべてが MANDATORY**：

- 各フェーズ・ステージの EXECUTE/SKIP 判定を行い、その根拠を監査ログに残す
- EXECUTE と判定したステージは成果物ファイルを生成し、承認ゲートを設ける
- 「承認ゲートを省く」「成果物ファイルを作らない」「監査ログを書かない」は許可されない
- Construction フェーズの完了メッセージは**必ず2択**（Request Changes / Continue）。3択以上の緊急動作は禁止
- `Docs/spec/aidlc-state.md` と `Docs/spec/aidlc-audit.md` はステージ完了ごとに更新する

`/aidlc` は Claude Code の通常（agent）モードで起動する。plan mode への切り替えは不要（上流 `core-workflow.md` は IDE・モード非依存で設計されており、plan mode 経由の発動を前提としない）。

---

## BookFlow 統合ノート

- **デフォルトのタスク源**: 特別な指示がない限り、`docs-next/docs/spec/enhancements/` 配下のビジネス要求シートをタスクの真実の源として扱う。Pre-flight で対象シートを特定済みの場合、Requirements Analysis はそのシートの背景・要件・受入条件を入力として使う（改めてゼロから要件を聞き直さない）。ユーザーが明示的に別のタスク（メンター指定のバグ修正・運用タスク等）を指定した場合はそちらを優先する。
- **チャットでのセルフ承認**: Workflow Planning ステージの完了時、エンジンが提示した実行計画に対して学習者自身がチャットで直接承認する（メンターの承認は不要）。`ExitPlanMode` は使わない。
- **ルール解決パス**: `.aidlc-rule-details/`（ワークスペースルートに配置、BookFlow 翻案済みステージファイルが入っている）
- **状態ファイル**: `Docs/spec/aidlc-state.md`（上流 `aidlc-docs/aidlc-state.md` に相当）
- **監査ログ**: `Docs/spec/aidlc-audit.md`（上流 `aidlc-docs/audit.md` に相当・追記専用）
- **設計成果物**: `Docs/spec/aidlc-docs/` 配下に生成する（既存の `docs-next/docs/spec/requirements.md` 等への統合はエンジンが行わない。`/update-spec` で Code Generation より前に統合する）
- **既存スキルとの補完**: `/update-spec` でエンジン成果を `docs-next/docs/spec/` へ統合する。`/create-pr` で PR 文面を組み立て・作成する。
- **AGENTS.md**: 非採用（Claude Code 専一）。

---

## Adaptive Workflow Principle

The workflow adapts to the work, not the other way around. The AI model intelligently assesses what stages are needed based on: user intent, existing codebase state, complexity and scope, risk and impact.

---

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
3. Check `Docs/spec/aidlc-state.md` (resume only if it records a workflow in progress; a template-state file — e.g. after Pre-flight C initialized it — means a new workflow); scan workspace; determine brownfield/greenfield; check for existing RE artifacts in `Docs/spec/aidlc-docs/inception/`
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
3. Execute（Pre-flight で対象エンハンス課題を特定済みの場合は、BookFlow 統合ノート「デフォルトのタスク源」に従い Pre-flight で特定したビジネス要求シート（`docs-next/docs/spec/enhancements/<難易度>/<short-desc>.md`）の背景・要件・受入条件を分析対象の入力として使う。load RE artifacts if brownfield, analyze request, determine depth, generate requirements document）
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
4. **Wait for Explicit Approval** — emphasize user control to override recommendations. BookFlow では学習者自身がチャットで直接承認する（メンターの承認は不要）
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

**BookFlow 翻案**: エンジン定義上は未実装のプレースホルダーだが、BookFlow では CI 品質ゲート（`CI Frontend` / `CI Backend`）を Operations 相当として運用する（詳細は `docs-next/docs/develop/aidlc-guide.md#phases` の OPERATIONS フェーズ参照）。

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
├── docs-next/docs/spec/                            # ドキュメント（真実の源）
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
├── .claude/skills/aidlc/SKILL.md         # ← このファイル（AI-DLC エンジン本体）
│
└── .aidlc-rule-details/                  # BookFlow 翻案済みステージファイル
    ├── common/
    ├── inception/
    ├── construction/
    ├── operations/
    └── extensions/
```

**CRITICAL**: アプリケーションコードは Workspace root（`Docs/spec/aidlc-docs/` には置かない）
