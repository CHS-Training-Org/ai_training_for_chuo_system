# Execution Plan — recurring-reservation

## Detailed Analysis Summary

### Transformation Scope（Brownfield）

- **Transformation Type**: Single component の拡張（既存の予約作成の流れを、繰り返し日の生成と一括作成に広げる。新しいレイヤーや外部連携は追加しない）
- **Primary Changes**: backend に V003 マイグレーション、`Reservation` の 3 列、繰り返し日を生成する純粋関数、`ReservationService.create` の一括作成（全件の重複判定とロールバック）、`CreateReservationRequest`・`ReservationResponse` の項目追加、`POST /api/reservations` のレスポンスの配列化、詳細 API のシリーズ件数・残り回数を加える。frontend に予約申請フォームの繰り返し入力、Server Action の配列対応、トースト、詳細画面のシリーズ情報を加える
- **Related Components**: `ReservationRepository`（シリーズ件数・残り回数の取得）、`ApprovalService.createInitialStep`（N 回呼ぶ）、`ResourceService.overlaps`（共用）、`lib/schemas/reservation.ts`・`lib/types/api.ts`・`lib/labels.ts`、`tests/unit/msw/handlers.ts`、既存の予約フローの E2E

### Change Impact Assessment

- **User-facing changes**: Yes（予約申請フォームに繰り返しの入力、登録成功のトースト、詳細画面にシリーズ情報）
- **Structural changes**: No（既存の 4 層構成に沿って、新規クラスは日付生成の純粋関数だけ）
- **Data model changes**: Yes（`reservations` に `recurrence_type`・`recurrence_until`・`series_id` を追加する V003。既存の行は `NONE` と NULL になる）
- **API changes**: Yes（`POST /api/reservations` のレスポンスが単体から配列に変わる破壊的変更、リクエストに 2 項目、`GET /api/reservations/{id}` にシリーズ情報）
- **NFR impact**: Yes（件数上限なしによるロック保持時間の増大。要件書で受け入れ済みのトレードオフ。拡張（Security / Resiliency / PBT）は不採用）

### Component Relationships（Brownfield）

- **Primary Component**: `backend/.../application/ReservationService`・`domain/Reservation`、`frontend/.../reservations/new/ReservationForm.tsx`
- **Dependent Components**: `ReservationController`・`ReservationResponse`・`CreateReservationRequest`、`ApprovalService`（承認ステップの作成）、`server/actions/reservations.ts`、予約詳細画面
- **Shared Components**: `ResourceService.overlaps`、`lib/datetime.ts`、`ResourceRepository.findByIdForUpdate`
- **Supporting Components**: `docs-next/docs/spec/`（requirements・api-spec・er-diagram・screen-spec）、`tests/unit/` と `backend/src/test/`

### Risk Assessment

- **Risk Level**: Medium（既存の予約作成を変更し、レスポンスの形が破壊的に変わる。DB のスキーマ変更を伴い、V003 は H2 のテストで検証されない。リソース行の悲観ロックを取ったままの一括作成で、件数上限もない）
- **Rollback Complexity**: Moderate（コードはコミットの取り消しで戻せるが、V003 を適用した DB から列を戻すには追加のマイグレーションが必要）
- **Testing Complexity**: Complex（日付生成の境界、全件のロールバック、自己重複、下書き・承認との併用、400 と 409 の使い分け、フォームの条件付き入力を検証する。V003 の SQL と悲観ロックの並行性は、自動テストでは検証できず、PostgreSQL での手動確認が必要）

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
  - **Rationale**: 新しく追加するクラスは日付生成の純粋関数 1 つだけで、残りは既存の `ReservationService`・`Reservation`・DTO・フォームの拡張であり、境界は既存の 4 層構成に収まる。メソッド単位の署名と責務は Functional Design で定義する
- [ ] Units Generation — **SKIP**
  - **Rationale**: Issue #31 は単一の units of work（縦切り 1 機能）であり、複数ユニットへの分解は不要

### 🟢 CONSTRUCTION PHASE（ユニット: recurring-reservation）

- [ ] Functional Design — **EXECUTE**
  - **Rationale**: 次の設計を Code Generation の前に明文化する必要がある。(1) 繰り返し日の生成アルゴリズム（月末スキップ、基準日からの数え方、終了日当日、日またぎ）、(2) 全件の重複判定の方式（既存予約を 1 回取得してメモリ上で既存との重複と自己重複を判定する案を含む）、(3) V003 の列の型・既定値・制約・インデックス、(4) `Reservation.create` が上限の 7 引数に達していることへの対処、(5) 詳細 API のシリーズ件数・残り回数の取得、(6) 400 と 422 と 409 の振り分け、(7) フォームの条件付き入力と Server Action の配列対応
- [ ] NFR Requirements — **SKIP**
  - **Rationale**: 件数上限なしによるロック時間の増大は、要件書で受け入れ済みのトレードオフで、数値目標はない。重複判定を 1 回の取得にまとめる方針は Functional Design で扱う。Security / Resiliency / PBT 拡張は不採用
- [ ] NFR Design — **SKIP**
  - **Rationale**: NFR Requirements に連動して SKIP
- [ ] Infrastructure Design — **SKIP**
  - **Rationale**: インフラ変更は発生しない。V003 は DB のスキーマ変更であり、Functional Design で扱う
- [ ] Code Generation — **EXECUTE (ALWAYS)**
  - **Rationale**: 実装計画の作成とコード生成が必要。着手前に `/update-spec` で requirements・api-spec・er-diagram・screen-spec を更新する（Spec-first）
- [ ] Build and Test — **EXECUTE (ALWAYS)**
  - **Rationale**: ビルド・テストの実行と検証が必要。V003 の PostgreSQL での確認と、悲観ロック下の一括作成の手動確認手順を含める

### 🟡 OPERATIONS PHASE

- [ ] Operations — **PLACEHOLDER**
  - **Rationale**: BookFlow では CI 品質ゲート（`CI Frontend` / `CI Backend`）として運用。PR 作成・push 後に自動実行

## Package Change Sequence（Brownfield）

1. `docs-next/docs/spec/`：requirements・api-spec・er-diagram・screen-spec を先に更新（Spec-first）
2. backend：V003 と `Reservation` の 3 列 → 繰り返し日を生成する純粋関数 → `CreateReservationRequest`・`ReservationResponse` → `ReservationRepository` のクエリ → `ReservationService`（一括作成） → `ReservationController`（レスポンスの配列化）。各層のテストを同時に書く
3. frontend：型・スキーマ・ラベル → Server Action の配列対応 → `ReservationForm` の繰り返し入力とトースト → 詳細画面のシリーズ情報。既存のテストと MSW を配列に追従させる
   - **Reason**: frontend の Server Action は backend の API 契約（配列のレスポンス、パラメータ、エラー）に依存するため、backend を先に確定する

## Estimated Timeline

- **Total Phases**: 3（Functional Design・Code Generation・Build and Test）
- **Estimated Duration**: ビジネス要求シートの見積り（1〜2 日）に準拠

## Success Criteria

- **Primary Goal**: 予約申請フォームで毎週・毎月の繰り返しと終了日を指定すると、複数の予約が 1 回の操作で登録され、1 件でも重複すれば全件が失敗する
- **Key Deliverables**: backend（V003、`Reservation` の 3 列、日付生成の純粋関数、一括作成、DTO、配列のレスポンス、詳細 API のシリーズ情報）、frontend（繰り返し入力、トースト、Server Action の配列対応、詳細画面のシリーズ情報）、spec 更新、関連テスト一式
- **Quality Gates**: `./gradlew test`・`./gradlew spotlessCheck`・`./gradlew checkstyleMain`・`pnpm lint`・`pnpm format:check`・`pnpm test`・`pnpm build` がすべて成功。stories.md の受入条件（US-01〜08）と requirements.md の受入条件をすべて満たす。既存のテストが（配列化への追従後に）回帰していない
- **Integration Testing**: `ReservationControllerTest` で、繰り返しの生成件数、全件ロールバック（既存との重複・自己重複）、400 の 3 パターン、下書き・承認要リソースとの併用、詳細 API のシリーズ情報を確認する。V003 は PostgreSQL でのローカル起動で確認する
