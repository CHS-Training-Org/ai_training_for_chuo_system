# Execution Plan — resource-list-sort（Issue #22）

## Detailed Analysis Summary

### Transformation Scope（Brownfield）

- **Transformation Type**: Single component change（既存の `ResourceController`/`ResourceService`/`ResourceRepository`/`ResourceFilterForm` の拡張。新規コンポーネントなし）
- **Primary Changes**: `GET /api/resources` に `sort` パラメータを追加し、`Pageable` の `Sort` を 2 つの一覧取得経路（`listPaginated`・`listWithAvailabilityFilter`）の両方に適用する
- **Related Components**: `ResourceController`・`ResourceService`・`ResourceFilterForm.tsx`・`resources/page.tsx`・`server/actions/resources.ts`（いずれも Issue #23 で keyword 検索に対応済みの同一ファイル群）

### Change Impact Assessment

- **User-facing changes**: Yes — `/resources` にソート選択ドロップダウンが追加され、一覧の表示順が変わる
- **Structural changes**: No — 既存の 4 層アーキテクチャ・既存コンポーネント境界内で完結
- **Data model changes**: No — スキーマ変更不要（既存カラムでのソートのみ）
- **API changes**: Yes — `GET /api/resources` に `sort` クエリパラメータを追加（後方互換・既定値あり）
- **NFR impact**: No（新規の性能・セキュリティ・スケーラビリティ要件はなし。H2/PostgreSQL の NULL 並び順整合性は Functional Design 内の業務ルールとして扱う）

### Component Relationships

- **Primary Component**: `ResourceController`・`ResourceService`・`ResourceRepository`（backend）、`ResourceFilterForm`・`resources/page.tsx`・`server/actions/resources.ts`（frontend）
- **Dependent Components**: なし（`ResourceService#list` の呼び出し元は `ResourceController` のみ。`listResourcesAction` の呼び出し元は `resources/page.tsx` のほか `reservations/new/page.tsx`・`admin/resources/page.tsx` があるが、`sort` は任意パラメータの追加のため既存呼び出しに影響しない）
- **Supporting Components**: なし

### Risk Assessment

- **Risk Level**: Medium（変更範囲自体は小さいが、Reverse Engineering で判明したとおり `listWithAvailabilityFilter`〔手動ページネーション経路〕は `Sort` を自動適用しないため、実装を誤ると「カテゴリ・期間フィルタとの組み合わせ時にソートが効かない」という受入条件未達の回帰を生みやすい）
- **Rollback Complexity**: Easy（単一ユニットの変更、`sort` パラメータ自体は後方互換）
- **Testing Complexity**: Moderate（2 経路それぞれでのソート確認、NULL capacity の扱い、不正値のバリデーションなど分岐が多い）

## Workflow Visualization

```mermaid
flowchart TD
    Start(["User Request"])

    subgraph INCEPTION["INCEPTION PHASE"]
        WD["Workspace Detection<br/><b>COMPLETED</b>"]
        RE["Reverse Engineering<br/><b>COMPLETED（スコープ限定）</b>"]
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
        OPS["Operations<br/><b>CI 品質ゲート</b>"]
    end

    Start --> WD --> RE --> RA --> US --> WP
    WP -.-> AD
    WP -.-> UG
    WP --> FD
    FD -.-> NFRA
    NFRA -.-> NFRD
    NFRD -.-> ID
    FD --> CG
    CG --> BT
    BT -.-> OPS
    BT --> End(["Complete"])

    style WD fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RE fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style RA fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style US fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style WP fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style CG fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style BT fill:#4CAF50,stroke:#1B5E20,stroke-width:3px,color:#fff
    style FD fill:#FFA726,stroke:#E65100,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style AD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style UG fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRA fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style NFRD fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style ID fill:#BDBDBD,stroke:#424242,stroke-width:2px,stroke-dasharray: 5 5,color:#000
    style OPS fill:#FFF59D,stroke:#F57F17,stroke-width:3px,stroke-dasharray: 5 5,color:#000
    style Start fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000
    style End fill:#CE93D8,stroke:#6A1B9A,stroke-width:3px,color:#000

    linkStyle default stroke:#333,stroke-width:2px
```

### テキスト代替（図のフォールバック）

```
Phase 1: INCEPTION
- Workspace Detection (COMPLETED)
- Reverse Engineering (COMPLETED・スコープ限定)
- Requirements Analysis (COMPLETED)
- User Stories (COMPLETED)
- Workflow Planning (IN PROGRESS)
- Application Design (SKIP)
- Units Generation (SKIP)

Phase 2: CONSTRUCTION（ユニット: resource-sort）
- Functional Design (EXECUTE)
- NFR Requirements (SKIP)
- NFR Design (SKIP)
- Infrastructure Design (SKIP)
- Code Generation (EXECUTE)
- Build and Test (EXECUTE)

Phase 3: OPERATIONS
- CI 品質ゲート（PR 作成後に自動実行）
```

## Phases to Execute

### 🔵 INCEPTION PHASE

- [x] Workspace Detection (COMPLETED)
- [x] Reverse Engineering (COMPLETED・スコープ限定で `code-structure-resource-sort.md` のみ追加)
- [x] Requirements Analysis (COMPLETED)
- [x] User Stories (COMPLETED)
- [x] Workflow Planning (IN PROGRESS)
- [ ] Application Design — **SKIP**
  - **Rationale**: 新規コンポーネント・サービス層設計は不要。既存の `ResourceController`/`ResourceService`/`ResourceRepository`/`ResourceFilterForm` の境界内で完結する
- [ ] Units Generation — **SKIP**
  - **Rationale**: Issue = 単一 units of work（BookFlow の縦切り方針）。複数ユニットへの分解は不要

### 🟢 CONSTRUCTION PHASE（ユニット: resource-sort）

- [ ] Functional Design — **EXECUTE**
  - **Rationale**: `sort` パラメータのホワイトリスト検証方式、`listWithAvailabilityFilter` 経路への `Comparator` ベースソート適用方式、NULL capacity の扱いなど、技術非依存の業務ロジック設計判断が複数あるため
- [ ] NFR Requirements — **SKIP**
  - **Rationale**: 新規の性能・セキュリティ・スケーラビリティ要件・技術スタック選定はない。H2/PostgreSQL の NULL 並び順整合性は Functional Design の業務ルールとして扱う
- [ ] NFR Design — **SKIP**
  - **Rationale**: NFR Requirements が SKIP のため連動
- [ ] Infrastructure Design — **SKIP**
  - **Rationale**: インフラ構成に変更なし
- [ ] Code Generation — **EXECUTE (ALWAYS)**
  - **Rationale**: 実装計画の作成とコード生成が必要
- [ ] Build and Test — **EXECUTE (ALWAYS)**
  - **Rationale**: ビルド・テスト・検証が必要

### 🟡 OPERATIONS PHASE

- [ ] Operations — **PLACEHOLDER**
  - **Rationale**: BookFlow では CI 品質ゲート（`CI Frontend`/`CI Backend`）として運用。PR 作成・push 時に自動実行

## Estimated Timeline

- **Total Phases**: INCEPTION（完了）→ CONSTRUCTION（Functional Design・Code Generation・Build and Test）
- **Estimated Duration**: ビジネス要求シート記載の推定工数どおり 1〜2 時間相当（Beginner 課題）

## Success Criteria

- **Primary Goal**: `/resources` でカテゴリ・期間・キーワードフィルタと組み合わせて名称順・定員順・登録日時順（デフォルト）のソートができる
- **Key Deliverables**: backend（`sort` パラメータ・ホワイトリスト検証・2 経路双方へのソート適用）、frontend（ソート選択ドロップダウン）、対応するユニットテスト・結合テスト、仕様書更新（`api-spec.md`・`screen-spec.md`）
- **Quality Gates**: 既存テスト（`ResourceServiceTest`・`ResourceControllerTest`）が継続して pass すること、新規ソート関連テストが H2 実データで検証されること
- **Integration Testing**: `listWithAvailabilityFilter` 経路（from/to 指定時）でもソートが適用されることを結合テストで確認する
