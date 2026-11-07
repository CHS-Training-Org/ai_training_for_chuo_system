# Workspace Detection

**Purpose**: Determine workspace state and check for existing AI-DLC projects

## Step 1: Check for Existing AI-DLC Project

Check `Docs/spec/aidlc-state.md`（BookFlow 翻案：このファイルは `main` にもトランクにも常に存在するため、存在ではなく中身で判断する。新規か再開かの判定と、前の作業の記録の初期化は、`/aidlc` スキルの Pre-flight がこのステージより前に行う）:
- **If it records a workflow in progress**（Pre-flight が「作業中」と判定したもの。対象タスクが現在のブランチと一致し、完了していない）: Resume from last phase (load context from previous phases)
- **If not exists, or still the template**（Stage Progress のチェックがすべて `[ ]` で、Status がプレースホルダーのまま。Pre-flight の初期化の直後もこれにあたる）: Continue with new project assessment

## Step 2: Scan Workspace for Existing Code

**Determine if workspace has existing code:**
- Scan workspace for source code files (.java, .py, .js, .ts, .jsx, .tsx, .kt, .kts, .scala, .groovy, .go, .rs, .rb, .php, .c, .h, .cpp, .hpp, .cc, .cs, .fs, etc.)
- Check for build files (pom.xml, package.json, build.gradle, etc.)
- Look for project structure indicators
- Identify workspace root directory (NOT Docs/spec/aidlc-docs/)

**Record findings:**
```markdown
## Workspace State
- **Existing Code**: [Yes/No]
- **Programming Languages**: [List if found]
- **Build System**: [Maven/Gradle/npm/etc. if found]
- **Project Structure**: [Monolith/Microservices/Library/Empty]
- **Workspace Root**: [Absolute path]
```

## Step 3: Determine Next Phase

**IF workspace is empty (no existing code)**:
- Set flag: `brownfield = false`
- Next phase: Requirements Analysis

**IF workspace has existing code**:
- Set flag: `brownfield = true`
- Check for existing reverse engineering artifacts in `Docs/spec/aidlc-docs/inception/reverse-engineering/`
- **IF reverse engineering artifacts exist**:
    - Check if artifacts are stale (compare artifact timestamps against codebase's last significant modification)
    - **IF artifacts are current**: Load them, skip to Requirements Analysis
    - **IF artifacts are stale**: Next phase is Reverse Engineering (rerun to refresh artifacts)
    - **IF user explicitly requests rerun**: Next phase is Reverse Engineering regardless of staleness
- **IF no reverse engineering artifacts**: Next phase is Reverse Engineering

## Step 4: Create Initial State File

Create `Docs/spec/aidlc-state.md`（BookFlow 翻案：テンプレートのままのファイルがある場合は、下記の骨組みで置き換えず、テンプレートの構成（frontmatter・Extension Configuration・Stage Progress の一覧など）を保ったまま各欄を埋める。`Target Branch`・`Target Enhancement Sheet` には Pre-flight で確定した対象タスクを記入する（テンプレートに欄が無ければ Project Information に追加する）。次回の起動時に Pre-flight がこの欄と現在のブランチを比べる）:

```markdown
# AI-DLC State Tracking

## Project Information
- **Project Type**: [Greenfield/Brownfield]
- **Start Date**: [ISO timestamp]
- **Current Stage**: INCEPTION - Workspace Detection
- **Target Branch**: [feature/<GitHubユーザー名>/<issue番号>-<short-desc>]
- **Target Enhancement Sheet**: [docs-next/docs/spec/enhancements/<難易度>/<short-desc>.md、または なし]

## Workspace State
- **Existing Code**: [Yes/No]
- **Reverse Engineering Needed**: [Yes/No]
- **Workspace Root**: [Absolute path]

## Code Location Rules
- **Application Code**: Workspace root (NEVER in Docs/spec/aidlc-docs/)
- **Documentation**: Docs/spec/aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Stage Progress
[Will be populated as workflow progresses]
```

## Step 5: Present Completion Message

**For Brownfield Projects:**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Brownfield project
• [AI-generated summary of workspace findings in bullet points]
• **Next Step**: Proceeding to **Reverse Engineering** to analyze existing codebase...
```

**For Greenfield Projects:**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Greenfield project
• **Next Step**: Proceeding to **Requirements Analysis**...
```

## Step 6: Automatically Proceed

- **No user approval required** - this is informational only
- Automatically proceed to next phase:
  - **Brownfield**: Reverse Engineering (if no existing artifacts) or Requirements Analysis (if artifacts exist)
  - **Greenfield**: Requirements Analysis
