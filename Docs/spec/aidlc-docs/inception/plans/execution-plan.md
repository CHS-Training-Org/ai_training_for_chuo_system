# Execution Plan — csv-report

## Detailed Analysis Summary

### Transformation Scope（Brownfield）

- **Transformation Type**: Single component 追加が中心（予約ドメインの読み取り専用の新規エンドポイントと、既存の予約一覧画面へのボタン追加。既存の予約作成・更新・承認ロジックには触れない）
- **Primary Changes**: backend に帳票出力の Controller・Service・`CsvWriter`・全件取得クエリを新設し、frontend に Route Handler とダウンロードボタンを追加する
- **Related Components**: `ReservationRepository`（全件取得クエリの追加）、`SecurityConfig` と `@PreAuthorize` の既存方式、`/reservations` ページと `ReservationFilterForm` の searchParams

### Change Impact Assessment

- **User-facing changes**: Yes（ADMIN 向けの「CSV ダウンロード」ボタンと CSV ファイル）
- **Structural changes**: No（新しいレイヤーや外部連携は追加しない。既存の 4 層構成に沿って新規クラスを置く）
- **Data model changes**: No（テーブル・マイグレーションの変更なし。読み取りのみ）
- **API changes**: Yes（`GET /api/reports/reservations/csv` の新設。既存 API の破壊的変更はない）
- **NFR impact**: Yes（ADMIN 限定、CSV 数式インジェクション対策、件数上限なしによるメモリ使用量）。ただし要件書で機能要件・受け入れ済みトレードオフとして扱うため、拡張（Security / Resiliency / PBT）は不採用

### Component Relationships（Brownfield）

- **Primary Component**: `backend/.../presentation/ReportController`・`application/ReservationReportService`・`application/csv/CsvWriter`（いずれも新規）
- **Dependent Components**: `ReservationRepository`（クエリ追加）、フロントの `/reservations` ページ（ボタン追加）、Route Handler（新規。`getAccessToken` と `BACKEND_URL` を使う）
- **Supporting Components**: `docs-next/docs/spec/`（api-spec・screen-spec・requirements）、`tests/unit/` と `backend/src/test/`

### Risk Assessment

- **Risk Level**: Low（読み取り専用の新規追加で既存ロジックを変更しない。ロールバックはコミットの取り消しで足りる）
- **Rollback Complexity**: Easy
- **Testing Complexity**: Moderate（CSV のバイト列（BOM・CRLF・エスケープ）、ロール別の 401/403、期間・ステータスの組合せ、Route Handler のバイナリ中継を検証する）

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
  - **Rationale**: 追加するクラス（`ReportController`・`ReservationReportService`・`CsvWriter`・`ReportCondition`、Route Handler、ボタン）は要件書の「影響範囲」で既に列挙済みで、境界は既存の 4 層構成に収まる。メソッド単位の署名と責務は Functional Design で定義する
- [ ] Units Generation — **SKIP**
  - **Rationale**: Issue #29 は単一の units of work（縦切り 1 機能）であり、複数ユニットへの分解は不要

### 🟢 CONSTRUCTION PHASE（ユニット: csv-report）

- [ ] Functional Design — **EXECUTE**
  - **Rationale**: CSV の列定義と値の整形（日時書式・承認状態ラベル・ソート）、エスケープと数式対策のルール、期間・ステータスの絞り込みクエリ、Route Handler の中継仕様（ヘッダ・ステータスコードの扱い）を Code Generation 前に明文化する
- [ ] NFR Requirements — **SKIP**
  - **Rationale**: ADMIN 限定と数式対策は機能要件として要件書に記載済み。Security / Resiliency / PBT 拡張は不採用、件数上限なしは受け入れ済みのトレードオフ
- [ ] NFR Design — **SKIP**
  - **Rationale**: NFR Requirements に連動して SKIP
- [ ] Infrastructure Design — **SKIP**
  - **Rationale**: インフラ変更は発生しない
- [ ] Code Generation — **EXECUTE (ALWAYS)**
  - **Rationale**: 実装計画の作成とコード生成が必要。着手前に `/update-spec` で api-spec・screen-spec・requirements を更新する（Spec-first）
- [ ] Build and Test — **EXECUTE (ALWAYS)**
  - **Rationale**: ビルド・テストの実行と検証が必要

### 🟡 OPERATIONS PHASE

- [ ] Operations — **PLACEHOLDER**
  - **Rationale**: BookFlow では CI 品質ゲート（`CI Frontend` / `CI Backend`）として運用。PR 作成・push 後に自動実行

## Package Change Sequence（Brownfield）

1. `docs-next/docs/spec/`：api-spec・screen-spec・requirements を先に更新（Spec-first）
2. backend：`CsvWriter` → `ReportCondition` と Repository クエリ → `ReservationReportService` → `ReportController`（各層のテストを同時に書く）
3. frontend：Route Handler → `CsvDownloadButton` → `/reservations` ページへの組み込み
   - **Reason**: frontend の Route Handler は backend の API 契約（パス・ヘッダ・ステータスコード）に依存するため、backend を先に確定する

## Estimated Timeline

- **Total Phases**: 3（Functional Design・Code Generation・Build and Test）
- **Estimated Duration**: ビジネス要求シートの見積り（半日〜1日）に準拠

## Success Criteria

- **Primary Goal**: ADMIN が `/reservations` から、絞り込み条件を引き継いだ予約一覧を UTF-8 BOM 付き CSV でダウンロードできる
- **Key Deliverables**: backend（`ReportController`・`ReservationReportService`・`CsvWriter`・`ReportCondition`・Repository クエリ）、frontend（Route Handler・`CsvDownloadButton`・ページ組み込み）、spec 更新、関連テスト一式
- **Quality Gates**: `./gradlew test`・`pnpm lint`・`pnpm format:check`・`pnpm test`・`pnpm build` がすべて成功。stories.md の受入条件（US-01〜05）と requirements.md の受入条件 5 項目をすべて満たす。既存の予約一覧・テストが回帰していないこと

- **Integration Testing**: ADMIN の 200（BOM・ヘッダ・本文）と MEMBER・APPROVER の 403・未認証の 401 を `ReportControllerTest` で確認し、既存の予約一覧 API が変わらないことを確認する
