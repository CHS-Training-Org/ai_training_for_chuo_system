# System Architecture

## System Overview

BookFlow は「Next.js フロントエンド（BFF 兼務）+ Spring Boot バックエンド + PostgreSQL」の2層モノリス構成。マイクロサービス・Lambda・CDK は存在しない（本番想定アーキテクチャは AWS ECS Fargate 2本 + RDS + Cognito だが、本リポジトリはローカル DevContainer 上で完結する学習用モノレポである）。

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client
        Browser["ブラウザ"]
    end
    subgraph FE["frontend (Next.js 15 / React 19, port 3000)"]
        Pages["src/app （Server Components・ページ）"]
        Actions["src/server/actions （Server Actions = BFF 層）"]
        Auth["Better Auth + Cognito クライアント"]
    end
    subgraph BE["backend (Spring Boot 4.0 / Java 25, port 8080)"]
        Presentation["presentation （Controller・DTO）"]
        Application["application （Service）"]
        Domain["domain （Entity・Repository interface）"]
        Infrastructure["infrastructure （Security config 等）"]
    end
    DB[("PostgreSQL")]
    CognitoLocal["cognito-local"]

    Browser --> Pages
    Pages --> Actions
    Actions -->|REST + Bearer Token| Presentation
    Auth -->|OIDC| CognitoLocal
    Presentation --> Application
    Application --> Domain
    Domain -->|Spring Data JPA| DB
    Infrastructure -.->|JWT 検証| Presentation
```

## Component Descriptions

### frontend
- **Purpose**: 画面描画と BFF（バックエンド API 呼び出しの集約・認証トークン管理）
- **Responsibilities**: Server Components によるページ描画、Server Actions（`src/server/actions/`）からのバックエンド呼び出し、Zod（`src/lib/schemas/`）によるフォーム検証
- **Dependencies**: backend（REST API）、Cognito/cognito-local（認証）
- **Type**: Application

### backend
- **Purpose**: 業務ロジックの実装と永続化
- **Responsibilities**: 4層アーキテクチャ（domain / application / presentation / infrastructure）の実装、OAuth2 Resource Server によるアクセストークン検証、Flyway によるスキーマ管理
- **Dependencies**: PostgreSQL
- **Type**: Application

### docs-next
- **Purpose**: 仕様書・開発ガイドの公開（Docusaurus）
- **Responsibilities**: `docs/spec/` を真実の源として維持
- **Dependencies**: なし（frontend/backend とは独立）
- **Type**: Application（ドキュメントサイト、業務ロジックなし）

## Data Flow

```mermaid
sequenceDiagram
    participant U as 利用者（ブラウザ）
    participant FE as Next.js Server Action
    participant BE as Spring Boot Controller
    participant SVC as ResourceService
    participant DB as PostgreSQL

    U->>FE: /resources/{id} にアクセス
    FE->>BE: GET /api/resources/{id}（Bearer Token）
    BE->>SVC: get(id)
    SVC->>DB: SELECT * FROM resources WHERE id = ?
    DB-->>SVC: Resource 行
    SVC-->>BE: ResourceResponse
    BE-->>FE: 200 OK（JSON）
    FE-->>U: リソース詳細画面を描画
```

## Integration Points

- **External APIs**: なし（外部 SaaS 連携なし）
- **Databases**: PostgreSQL 1台（`departments` / `users` / `resources` / `reservations` / `approval_steps` の5テーブル、Flyway `V001__create_initial_schema.sql` で定義）
- **Third-party Services**: Amazon Cognito（本番）／ cognito-local（ローカル開発、`docker-compose.yml` の `cognito-local` サービス）

## Infrastructure Components

- **CDK Stacks**: 該当なし（本リポジトリに IaC コードは含まれない。本番アーキテクチャは `docs-next/docs/reference/architecture.md` に文書化されているのみ）
- **Deployment Model**: ローカルは DevContainer + Docker Compose（`frontend` / `postgres` / `localstack` / `cognito-local` / `docs` の5サービス）。本番想定は GitHub Actions → ECR → ECS ローリングデプロイ（ドキュメント上のみ、本リポジトリでは未実装）
- **Networking**: 該当なし（ローカル Docker ネットワークのみ、VPC 等の設計はスコープ外）
