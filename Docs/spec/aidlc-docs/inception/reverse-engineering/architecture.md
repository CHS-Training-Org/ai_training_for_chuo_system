# System Architecture

## System Overview

Next.js 15（App Router）が BFF として Server Actions 経由で Spring Boot 4 の REST API（`/api`）を呼ぶ 2 層構成。認証は Cognito 発行 JWT（Better Auth）。バックエンドは domain / application / presentation / infrastructure の 4 層。DB は PostgreSQL（Flyway 管理、テストは H2）。

## Architecture Diagram

```mermaid
flowchart TD
    Browser["Browser"]
    Page["resources/page.tsx Server Component"]
    Form["ResourceFilterForm.tsx Client Component"]
    Action["server/actions/resources.ts Server Action"]
    Ctrl["ResourceController"]
    Svc["ResourceService"]
    Repo["ResourceRepository JpaRepository"]
    DB[("PostgreSQL resources / reservations")]
    Browser --> Page
    Browser --> Form
    Form -->|"router.push searchParams"| Page
    Page --> Action
    Action -->|"GET /api/resources"| Ctrl
    Ctrl --> Svc
    Svc --> Repo
    Repo --> DB
```

## Component Descriptions

### ResourceController（presentation）
- **Purpose**: `GET /api/resources` 等の受付。`from`/`to` の同時指定検証、ADMIN 判定
- **Dependencies**: ResourceService
- **Type**: Application

### ResourceService（application）
- **Purpose**: ロール別一覧、空きフィルタ、CRUD
- **Dependencies**: ResourceRepository, ReservationRepository

### ResourceRepository（domain インターフェース）
- **Purpose**: 永続化。ページあり/なし × カテゴリ有/無 × active のみ/全件 の一覧取得 8 通り（派生クエリ 6 本 + `JpaRepository` 継承の `findAll` 2 本）

## Data Flow（一覧取得）

```mermaid
sequenceDiagram
    participant U as User
    participant P as page.tsx
    participant A as listResourcesAction
    participant C as ResourceController
    participant S as ResourceService
    U->>P: /resources?category=ROOM&from=..&to=..
    P->>A: params
    A->>C: GET /api/resources
    C->>S: list(category, from, to, isAdmin, pageable)
    alt from と to が両方指定
        S->>S: 全候補取得 -> 占有除外 -> 手動ページング
    else 指定なし
        S->>S: リポジトリのページング
    end
    S-->>P: Page of ResourceResponse
```

## Integration Points
- **External APIs**: Cognito（JWT 発行・検証）
- **Databases**: PostgreSQL（本番・ローカル）/ H2（テスト）
- **Third-party Services**: なし

## Infrastructure Components
- **Deployment Model**: ローカルは DevContainer + Docker Compose。本課題のスコープ外
