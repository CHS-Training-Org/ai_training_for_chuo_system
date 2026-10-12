# Execution Plan — usage-report

## Detailed Analysis Summary

### Transformation Scope（Brownfield）

- **Transformation Type**: Single component 追加が中心（予約・リソースの読み取り専用の集計 API と、新規の管理者向け統計ページ。既存の予約作成・更新・承認ロジックには触れない）
- **Primary Changes**: backend に統計の Controller・Service・集計条件と応答の DTO・取得クエリを新設し、frontend に `/admin/reports` ページ・期間フィルタ・自前の棒グラフ・Server Action を追加してサイドナビに項目を足す
- **Related Components**: `ReservationRepository`・`ResourceRepository`（取得クエリの追加）、`admin/layout.tsx` の ADMIN ガード、`nav-items.ts` とそのテスト、既存の `reservations/page.tsx` の searchParams と絞り込みフォームのパターン

### Change Impact Assessment

- **User-facing changes**: Yes（ADMIN 向けの新しい統計ページ、サイドナビの「利用実績」）
- **Structural changes**: No（新しいレイヤーや外部連携は追加しない。既存の 4 層構成に沿って新規クラスを置く）
- **Data model changes**: No（テーブル・マイグレーションの変更なし。読み取りのみ）
- **API changes**: Yes（`GET /api/statistics/resources` の新設。既存 API の破壊的変更はない）
- **NFR impact**: Yes（ADMIN 限定、件数上限なしの全件取得によるメモリ使用量、H2 と PostgreSQL の両対応）。ただし要件書で機能要件・受け入れ済みのトレードオフとして扱うため、拡張（Security / Resiliency / PBT）は不採用

### Component Relationships（Brownfield）

- **Primary Component**: `backend/.../presentation/StatisticsController`・`application/StatisticsService`（いずれも新規）、`frontend/.../admin/reports/page.tsx`（新規）
- **Dependent Components**: `ReservationRepository`・`ResourceRepository`（クエリ追加）、`nav-items.ts`（項目追加）、`lib/types/api.ts`（スキーマ追加）
- **Supporting Components**: `docs-next/docs/spec/`（api-spec・screen-spec・requirements）、`tests/unit/` と `backend/src/test/`

### Risk Assessment

- **Risk Level**: Low（読み取り専用の新規追加で既存ロジックを変更しない。ロールバックはコミットの取り消しで足りる）
- **Rollback Complexity**: Easy
- **Testing Complexity**: Moderate（期間での切り詰めと境界、0 件のリソースの含め方、ステータスの除外、ロール別の 401/403、棒グラフの相対値と整形を検証する）

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
  - **Rationale**: 追加するクラス（`StatisticsController`・`StatisticsService`・集計条件と応答の DTO、統計ページ・期間フィルタ・棒グラフ・Server Action）は要件書の「影響範囲」で既に列挙済みで、境界は既存の 4 層構成に収まる。メソッド単位の署名と責務は Functional Design で定義する
- [ ] Units Generation — **SKIP**
  - **Rationale**: Issue #28 は単一の units of work（縦切り 1 機能）であり、複数ユニットへの分解は不要

### 🟢 CONSTRUCTION PHASE（ユニット: usage-report）

- [ ] Functional Design — **EXECUTE**
  - **Rationale**: 期間での切り詰めと合算の計算（純粋関数）、有効・無効なリソースの含め方、取得クエリの設計（H2 と PostgreSQL の両対応）、並び順、棒グラフの相対値と時間の整形、Server Action の契約を Code Generation 前に明文化する
- [ ] NFR Requirements — **SKIP**
  - **Rationale**: ADMIN 限定と全件取得のトレードオフは要件書に記載済み。Security / Resiliency / PBT 拡張は不採用
- [ ] NFR Design — **SKIP**
  - **Rationale**: NFR Requirements に連動して SKIP
- [ ] Infrastructure Design — **SKIP**
  - **Rationale**: インフラ変更は発生しない。グラフライブラリの導入もなく、ADR も追加しない
- [ ] Code Generation — **EXECUTE (ALWAYS)**
  - **Rationale**: 実装計画の作成とコード生成が必要。着手前に `/update-spec` で api-spec・screen-spec・requirements を更新する（Spec-first）
- [ ] Build and Test — **EXECUTE (ALWAYS)**
  - **Rationale**: ビルド・テストの実行と検証が必要（OpenAPI への反映の確認を含む）

### 🟡 OPERATIONS PHASE

- [ ] Operations — **PLACEHOLDER**
  - **Rationale**: BookFlow では CI 品質ゲート（`CI Frontend` / `CI Backend`）として運用。PR 作成・push 後に自動実行

## Package Change Sequence（Brownfield）

1. `docs-next/docs/spec/`：api-spec・screen-spec・requirements を先に更新（Spec-first）
2. backend：切り詰め・合算の純粋関数 → 集計条件と応答の DTO・Repository のクエリ → `StatisticsService` → `StatisticsController`（各層のテストを同時に書く）
3. frontend：型とスキーマ・Server Action → 棒グラフ・期間フィルタ → `/admin/reports` ページ → ナビへの追加（`nav-items.ts` とテスト）
   - **Reason**: frontend の Server Action は backend の API 契約（パス・パラメータ・応答の項目・エラー）に依存するため、backend を先に確定する

## Estimated Timeline

- **Total Phases**: 3（Functional Design・Code Generation・Build and Test）
- **Estimated Duration**: ビジネス要求シートの見積り（半日〜1日）に準拠

## Success Criteria

- **Primary Goal**: ADMIN が `/admin/reports` で、期間を指定してリソース別の承認済み予約の件数と合計利用時間を棒グラフと表で確認できる
- **Key Deliverables**: backend（`StatisticsController`・`StatisticsService`・DTO・Repository のクエリ）、frontend（統計ページ・期間フィルタ・棒グラフ・Server Action・ナビ項目）、spec 更新、関連テスト一式
- **Quality Gates**: `./gradlew test`・`pnpm lint`・`pnpm format:check`・`pnpm test`・`pnpm build` がすべて成功。stories.md の受入条件（US-01〜05）と requirements.md の受入条件をすべて満たす。既存のテストが回帰していないこと

- **Integration Testing**: ADMIN の 200 と集計値（切り詰め・0 件のリソース・ステータス除外）、MEMBER・APPROVER の 403・未認証の 401、`from`/`to` の 400 を `StatisticsControllerTest` で確認し、OpenAPI（`/v3/api-docs`）にエンドポイントが載ることを確認する
