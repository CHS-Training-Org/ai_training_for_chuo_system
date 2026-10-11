# Execution Plan — calendar-view

## Detailed Analysis Summary

### Transformation Scope（Brownfield）

- **Transformation Type**: Single component change（リソース詳細画面1画面内の表示拡張）
- **Primary Changes**: 既存の空き状況リスト表示をカレンダー形式のUIに置き換える。新規Client Component（カレンダー本体）を追加し、既存のBFF関数（`getAvailabilityAction`）をそのまま流用する
- **Related Components**: `resources/[id]/page.tsx`（改修）、新規 `AvailabilityCalendar.tsx`、`reservations/new/page.tsx`・`ReservationForm.tsx`（日時引き継ぎクエリパラメータ追加）

### Change Impact Assessment

- **User-facing changes**: Yes（カレンダー表示・週/月切り替え・期間移動・空き枠クリックという新しい操作体験）
- **Structural changes**: No（新しいAPI・新しいルートは追加しない。既存画面内に閉じる）
- **Data model changes**: No（DBスキーマ変更なし、既存の`AvailabilitySlotSchema`をそのまま使う）
- **API changes**: No（`GET /api/resources/{id}/availability`をそのまま利用、バックエンド変更なし）
- **NFR impact**: No（requirements.mdのとおりSecurity/Resiliency/PBT拡張はいずれも不採用）

### Component Relationships（Brownfield）

- **Primary Component**: `frontend/src/app/(authenticated)/resources/[id]/`
- **Shared Components**: `server/actions/resources.ts`（`getAvailabilityAction`、変更なし）、`lib/types/api.ts`（`AvailabilitySlotSchema`、変更なし）
- **Dependent Components**: `reservations/new/`（日時引き継ぎクエリパラメータの受け取り側として改修）
- **Supporting Components**: `frontend/tests/unit/resource-detail-page.test.tsx`（既存リスト表示の置き換えに伴い更新が必要）

### Risk Assessment

- **Risk Level**: Low（単一画面・frontendのみ・既存APIをそのまま利用する孤立した変更。ロールバックは当該ファイル群の変更を戻すだけで完結する）
- **Rollback Complexity**: Easy
- **Testing Complexity**: Moderate（週/月の境界計算・時刻グリッドのクリック判定など、ユニットテストで検証すべきロジックが複数ある）

## Workflow Visualization

```mermaid
flowchart TD
    Start(["User Request"])

    subgraph INCEPTION["INCEPTION PHASE"]
        WD["Workspace Detection<br/><b>COMPLETED</b>"]
        RE["Reverse Engineering<br/><b>COMPLETED</b>"]
        RA["Requirements Analysis<br/><b>COMPLETED</b>"]
        US["User Stories<br/><b>COMPLETED</b>"]
        WP["Workflow Planning<br/><b>IN PROGRESS</b>"]
        AD["Application Design<br/><b>SKIP</b>"]
        UG["Units Generation<br/><b>SKIP</b>"]
    end

    subgraph CONSTRUCTION["CONSTRUCTION PHASE"]
        FD["Functional Design<br/><b>EXECUTE</b>"]
        NFRA["NFR Requirements<br/><b>SKIP</b>"]
        NFRD["NFR Design<br/><b>SKIP</b>"]
        ID["Infrastructure Design<br/><b>SKIP</b>"]
        CG["Code Generation<br/><b>EXECUTE</b>"]
        BT["Build and Test<br/><b>EXECUTE</b>"]
    end

    subgraph OPERATIONS["OPERATIONS PHASE"]
        OPS["Operations<br/><b>PLACEHOLDER</b>"]
    end

    Start --> WD
    WD --> RE
    RE --> RA
    RA --> US
    US --> WP
    WP --> AD
    AD --> UG
    UG --> FD
    FD --> NFRA
    NFRA --> NFRD
    NFRD --> ID
    ID --> CG
    CG --> BT
    BT --> OPS
    OPS --> End(["Complete"])

    style WD fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RE fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RA fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style US fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style WP fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style AD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style UG fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style FD fill:#FFA726,stroke:#E65100,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style NFRA fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style ID fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style CG fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style BT fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style Start fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000
    style End fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000

    linkStyle default stroke:#333,stroke-width:2px
```

## Phases to Execute

### 🔵 INCEPTION PHASE

- [x] Workspace Detection（COMPLETED）
- [x] Reverse Engineering（COMPLETED）
- [x] Requirements Analysis（COMPLETED）
- [x] User Stories（COMPLETED）
- [x] Execution Plan（IN PROGRESS）
- [ ] Application Design — **SKIP**
  - **Rationale**: 新規追加するのはリソース詳細画面という既存の画面境界内の1 Reactコンポーネントであり、新しいサービス・新しいAPI・新しいモジュール境界は発生しない。Application Designが対象とする「サービス層設計・コンポーネント間依存の整理」は不要
- [ ] Units Generation — **SKIP**
  - **Rationale**: Issue #27は単一のunits of work（縦切り1機能）であり、複数ユニットへの分解は不要

### 🟢 CONSTRUCTION PHASE

- [ ] Functional Design — **EXECUTE**
  - **Rationale**: 占有スロット（`OccupiedSlot[]`）から週/月グリッドの各セルの「空き/予約済み」状態を導出するロジック、週/月それぞれのfrom-to算出ロジック、クリック位置から開始日時文字列を組み立てるロジックは、現在どこにも実装がなく新規に設計が必要な複雑度を持つ（`complex business logic` に該当）
- [ ] NFR Requirements — **SKIP**
  - **Rationale**: requirements.mdのとおりSecurity/Resiliency/PBT拡張はいずれも不採用。新たな性能・セキュリティ要求はない
- [ ] NFR Design — **SKIP**
  - **Rationale**: NFR Requirementsに連動してSKIP
- [ ] Infrastructure Design — **SKIP**
  - **Rationale**: インフラ変更は発生しない
- [ ] Code Generation — **EXECUTE (ALWAYS)**
  - **Rationale**: 実装計画の作成とコード生成が必要
- [ ] Build and Test — **EXECUTE (ALWAYS)**
  - **Rationale**: ビルド・テストの実行と検証が必要

### 🟡 OPERATIONS PHASE

- [ ] Operations — **PLACEHOLDER**
  - **Rationale**: BookFlowではCI品質ゲート（`CI Frontend`）として運用。PR作成・push後に自動実行

## Estimated Timeline

- **Total Phases**: 3（Functional Design・Code Generation・Build and Test）
- **Estimated Duration**: ビジネス要求シートの見積り（半日〜1日）に準拠

## Success Criteria

- **Primary Goal**: リソース詳細画面にカレンダー形式の空き状況ビューを追加し、週/月切り替え・期間移動・空き枠クリックでの予約申請フォーム連携を実現する
- **Key Deliverables**: `AvailabilityCalendar.tsx`（新規）、`resources/[id]/page.tsx`（改修）、`reservations/new/` 配下（日時引き継ぎ改修）、関連ユニットテスト
- **Quality Gates**: `pnpm lint`・`pnpm format:check`・`pnpm test`・`pnpm build` すべて成功。requirements.mdの受入条件6項目をすべて満たす
