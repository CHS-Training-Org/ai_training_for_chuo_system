---
type: working-doc
title: System Architecture（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成するアーキテクチャ資料（今回のスコープ：予約の下書き保存）
timestamp: 2026-11-14
---

# System Architecture

**スコープ注記**: 予約の申請・参照・更新・取消・承認の流れに絞る。略記: `BE/` = `backend/src/main/java/com/example/bookflow/`、`FE/` = `frontend/src/`。

## System Overview

Next.js 15 の App Router（BFF + UI）が Server Actions 経由で Spring Boot の REST API を呼ぶ 2 層構成。バックエンドは domain / application / presentation / infrastructure の 4 層。永続化は Spring Data JPA（PostgreSQL、スキーマは Flyway）。

## Architecture Diagram

```mermaid
flowchart TB
  subgraph FE["frontend (Next.js)"]
    Pages["予約の各ページ"] --> Actions["Server Actions"]
  end
  subgraph BE["backend (Spring Boot)"]
    Ctrl["presentation: ReservationController"] --> Svc["application: ReservationService"]
    Svc --> ApprSvc["application: ApprovalService"]
    Svc --> Repo["domain: ReservationRepository"]
    ApprSvc --> StepRepo["domain: ApprovalStepRepository"]
  end
  Actions -->|"REST /api/reservations"| Ctrl
  Repo --> DB[("PostgreSQL")]
  StepRepo --> DB
```

## Component Descriptions

### ReservationService（BE/application/ReservationService.java）
- **Purpose**: 予約のユースケース（一覧・取得・作成・更新・取消）。
- **Responsibilities**: リソースの悲観ロック、`endAt > startAt` の検証、重複判定、状態決定、承認ステップ生成の委譲、権限チェック（手書きで `AccessDeniedException`）。
- **Dependencies**: ReservationRepository、ApprovalService、ResourceRepository、UserRepository。
- **Type**: Application

### ApprovalService（BE/application/ApprovalService.java）
- **Purpose**: 承認ステップの生成と、承認・却下。
- **Dependencies**: ApprovalStepRepository、ReservationRepository。
- **Type**: Application

### 予約の画面群（FE/app/(authenticated)/reservations/ 配下）と承認一覧（FE/app/(authenticated)/approvals/）
- **Purpose**: 一覧・申請フォーム・詳細・編集・承認一覧の UI。
- **Type**: Application（UI + BFF）

## Data Flow

現行の予約申請（`POST /api/reservations`）の流れ。

```mermaid
sequenceDiagram
  participant U as 申請者
  participant F as ReservationForm
  participant A as createReservationAction
  participant C as ReservationController
  participant S as ReservationService
  participant R as Repository
  U->>F: 予約を申請する
  F->>A: values
  A->>C: POST /api/reservations
  C->>S: create
  S->>R: リソースを悲観ロックで取得
  S->>S: endAt が startAt より後か検証
  S->>R: 占有予約との重複を確認
  S->>S: 承認要否で PENDING か APPROVED を決定
  S->>R: 予約を保存
  S->>S: 承認要なら承認ステップを生成
  S-->>C: ReservationResponse
  C-->>A: 201
  A-->>F: 成功
  F->>U: 一覧へ遷移
```

## Integration Points

- **External APIs**: なし（通知・メール・監査などの外部連携や副作用は、`backend/src` の grep で見つからなかった）。
- **Databases**: PostgreSQL。本番は Flyway（`V001__create_initial_schema.sql` のみ）、テストは H2（PostgreSQL モード）で Hibernate が `create-drop`（CHECK 制約は効かない）。
- **Third-party Services**: 認証は Cognito + Better Auth（FE）、Spring Security + OAuth2 Resource Server（BE）。

## Infrastructure Components

- **CDK Stacks**: なし。
- **Deployment Model**: ローカルは DevContainer + Docker Compose。
- **Networking**: 本スコープでは対象外。
