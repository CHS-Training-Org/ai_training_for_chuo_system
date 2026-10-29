# Execution Plan（CSV 帳票出力）

## Detailed Analysis Summary

### Transformation Scope (Brownfield Only)
- **Transformation Type**: Multiple components（新規エンドポイントと新規画面の追加。アーキテクチャ変更なし）
- **Primary Changes**: `GET /api/reports/reservations/csv` と CSV 生成ロジックの新設（BE）、`/admin/reservations` とダウンロード経路の新設（FE）、仕様書 3 件の更新
- **Related Components**: ReservationRepository（期間条件のクエリ）、SecurityConfig と `@PreAuthorize`、`nav-items.ts`、`api-client.ts`（非 JSON 応答の扱い）

### Change Impact Assessment
- **User-facing changes**: Yes。管理者ページとサイドナビ項目が加わる
- **Structural changes**: Minor。`presentation` に帳票用 Controller、`application` に帳票 Service と CSV 生成部を追加する
- **Data model changes**: No。DB スキーマ変更なし
- **API changes**: Yes（後方互換）。新規エンドポイントの追加のみ
- **NFR impact**: Minor。ADMIN 限定、数式インジェクション対策、大量データ時の出力方式（一括かストリーミングか）

### Component Relationships (Brownfield Only)
- **Primary Component**: backend（presentation、application、domain）、frontend（`/admin/reservations`）
- **Infrastructure Components**: なし
- **Shared Components**: なし
- **Dependent Components**: frontend は backend の REST に依存。後続課題 `openapi-client-gen` は新しいエンドポイントの影響を受ける
- **Change Type / Priority**: backend Minor・Critical path、frontend Minor・backend の後、docs Minor・実装より先

### Risk Assessment
- **Risk Level**: Medium
- **Rollback Complexity**: Easy（追加のみで、既存機能を変更しない）
- **Testing Complexity**: Moderate（BOM とエスケープの確認、JWT をサーバー側に持つ構成でのダウンロード経路、期間境界）
- **主な不確実点**: ダウンロード経路（Route Handler か Server Action か）、一括かストリーミングか

## Workflow Visualization

```mermaid
flowchart TD
    Start(["User Request"])

    subgraph INCEPTION["INCEPTION PHASE"]
        WD["Workspace Detection<br/>COMPLETED"]
        RE["Reverse Engineering<br/>COMPLETED"]
        RA["Requirements Analysis<br/>COMPLETED"]
        US["User Stories<br/>SKIP"]
        WP["Workflow Planning<br/>IN PROGRESS"]
        AD["Application Design<br/>EXECUTE"]
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

    subgraph OPERATIONS["OPERATIONS PHASE"]
        OPS["Operations<br/>PLACEHOLDER"]
    end

    Start --> WD
    WD --> RE
    RE --> RA
    RA --> WP
    WP --> AD
    AD --> CG
    CG --> BT
    BT --> End(["Complete"])

    style WD fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RE fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RA fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style WP fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style CG fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style BT fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style AD fill:#FFA726,stroke:#E65100,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style US fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style UG fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style FD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRA fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style ID fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style OPS fill:#FFF59D,stroke:#F9A825,stroke-width:2px,color:#000
    style Start fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000
    style End fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000
    linkStyle default stroke:#333,stroke-width:2px
```

### Text Alternative
```
INCEPTION:    WD(done) -> RE(done) -> RA(done) -> WP(now) -> AD(execute)
              US(skip), UG(skip)
CONSTRUCTION: CG(execute) -> BT(execute)
              FD, NFR Req, NFR Design, Infra Design (all skip)
OPERATIONS:   placeholder (CI Frontend / CI Backend が相当)
```

## Phases to Execute

### INCEPTION PHASE
- [x] Workspace Detection (COMPLETED)
- [x] Reverse Engineering (COMPLETED)
- [x] Requirements Analysis (COMPLETED)
- [ ] User Stories - SKIP
  - **Rationale**: 利用者は ADMIN の 1 ロールのみ。受入条件はシートと requirements.md で確定済み
- [x] Workflow Planning (IN PROGRESS)
- [ ] Application Design - EXECUTE
  - **Rationale**: 新しいコンポーネント（帳票 Controller と Service、CSV 生成部、期間条件のクエリ、ダウンロード用の FE 経路）の責務とメソッドを定義する。ダウンロード方式（Route Handler か Server Action か）と、一括かストリーミングかの判断をここで確定する
- [ ] Units Generation - SKIP
  - **Rationale**: BE と FE を縦切りの 1 ユニットで実装する。分割の必要がない

### CONSTRUCTION PHASE
- [ ] Functional Design - SKIP
  - **Rationale**: CSV の列、書式、エスケープ、期間の扱いは requirements.md で確定済み。新しいデータモデルなし
- [ ] NFR Requirements - SKIP
  - **Rationale**: 新規の性能・セキュリティ要件は requirements.md に含めた。出力方式は Application Design で判断する。拡張ルールはすべて No
- [ ] NFR Design - SKIP
  - **Rationale**: NFR Requirements を実施しないため
- [ ] Infrastructure Design - SKIP
  - **Rationale**: インフラ変更なし
- [ ] Code Generation - EXECUTE (ALWAYS)
  - **Rationale**: 実装。着手前に `/update-spec` で api-spec.md、screen-spec.md、requirements.md の権限マトリクスを更新する（Spec-first）
- [ ] Build and Test - EXECUTE (ALWAYS)
  - **Rationale**: `./gradlew checkstyleMain test`、`pnpm lint`、`pnpm format:check`、`pnpm test`、`npm run build`（docs-next）による検証

### OPERATIONS PHASE
- [ ] Operations - PLACEHOLDER
  - **Rationale**: BookFlow では CI（CI Frontend / CI Backend）が相当

## Package Change Sequence (Brownfield Only)
1. docs-next/docs/spec（`/update-spec`）
2. backend（Repository のクエリ、CSV 生成部、Service、Controller、テスト）
3. frontend（ダウンロード経路、`/admin/reservations`、ナビ項目、テスト）

## Estimated Timeline
- **Total Phases**: 実行 3 ステージ（Application Design、Code Generation、Build and Test）。Inception の 3 ステージは完了済み
- **Estimated Duration**: 2〜3 日（Issue の推定。シートの「半日〜1日」とは異なる）

## Success Criteria
- **Primary Goal**: ADMIN が期間とステータスで絞り込んだ予約一覧を、Excel で文字化けしない CSV としてダウンロードできる
- **Key Deliverables**: 仕様書 3 件の更新、BE と FE の実装、追加テスト
- **Quality Gates**: シートの受入条件 5 項目、既存テスト pass、lint と format の pass、`npm run build`（docs-next）の成功
