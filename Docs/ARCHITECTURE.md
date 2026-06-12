# AWS 標準アーキテクチャ（受注案件デフォルト構成）

> 戦略2：フルスクラッチを廃止するAWS標準アーキテクチャ  
> 社内 AI 駆動開発チュートリアル向け基盤ドキュメント

> **スコープ外**: VPC・サブネット・セキュリティグループ・IAM・Secrets Manager 等の AWS インフラ詳細はこのドキュメントでは扱わない。

---

## システム構成図

```mermaid
flowchart TD
    subgraph AI["🤖 AI / 開発支援レイヤー"]
        direction LR
        Bedrock["<b>Amazon Bedrock</b><br/>Claude 等 LLM API<br/>RAG・チャット・要約"]
        ClaudeCode["<b>Claude Code</b><br/>コーディングエージェント<br/>全開発者が利用"]
    end

    subgraph FE["🖥️ フロントエンド / BFF レイヤー"]
        direction LR
        Next["<b>Next.js</b> App Router + API Routes<br/>BFF / Server Actions でトークン保持<br/>バックエンド呼び出しを集約・変換"]
        FEInfra["<b>ECS Fargate + ECR</b><br/>ALB → ECS Tasks"]
        Next -.- FEInfra
    end

    subgraph AUTH["🔐 認証 / API Gateway レイヤー"]
        direction LR
        Cognito["<b>Amazon Cognito</b><br/>ユーザープール / IDプール"]
        APIGW["<b>Amazon API Gateway</b><br/>REST / HTTP API<br/>レート制限・ルーティング・Authorizer"]
    end

    subgraph SVLESS["⚡ サーバーレス処理"]
        Lambda["<b>AWS Lambda</b><br/>非同期・軽量単機能<br/>通知・バッチ・変換"]
    end

    subgraph BE["☕ バックエンドレイヤー"]
        Spring["<b>ECS Fargate + ECR</b><br/>Java / Spring Boot<br/>ALB → ECS Tasks"]
    end

    subgraph DB["🗄️ データベースレイヤー"]
        direction LR
        RDS[("<b>Amazon RDS</b><br/>PostgreSQL")]
        Dynamo[("<b>Amazon DynamoDB</b><br/>NoSQL・高スループット")]
        S3[("<b>Amazon S3</b><br/>ファイル / オブジェクト")]
    end

    Bedrock -. AI 機能 .-> Next
    ClaudeCode -. 開発支援 .-> Next
    Next ==>|API 呼び出し| APIGW
    Cognito -. JWT 検証 .-> APIGW
    APIGW ==> Lambda
    APIGW ==> Spring
    Spring ==> RDS
    Spring ==> Dynamo
    Spring ==> S3
    Lambda ==> Dynamo
    Lambda ==> S3

    classDef aiCls fill:#fff7ed,stroke:#fb923c,color:#7c2d12
    classDef feCls fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a
    classDef authCls fill:#fef2f2,stroke:#ef4444,color:#7f1d1d
    classDef svCls fill:#fefce8,stroke:#eab308,color:#713f12
    classDef beCls fill:#f0fdf4,stroke:#22c55e,color:#14532d
    classDef dbCls fill:#faf5ff,stroke:#a855f7,color:#581c87

    class Bedrock,ClaudeCode aiCls
    class Next,FEInfra feCls
    class Cognito,APIGW authCls
    class Lambda svCls
    class Spring beCls
    class RDS,Dynamo,S3 dbCls
```

> **CI/CD・監視レイヤー**: GitHub Actions → ECR → ECS のローリングデプロイで上記コンテナ群を配信し、Amazon CloudWatch が全レイヤーのログ・メトリクス・アラームを収集する（横断的関心事のため図では省略）。

---

## 各レイヤーの設計指針とローカル開発の実現性

### AI / 開発支援レイヤー

| コンポーネント     | 役割                                                          |
| ------------------ | ------------------------------------------------------------- |
| **Amazon Bedrock** | 開発時に AI エージェントを呼び出すための LLM API（Claude 等） |
| **Claude Code**    | ターミナル / IDE で動作するコーディングエージェント           |

### フロントエンド / BFF レイヤー（Next.js on ECS）

Next.js を ECS Fargate 上で動かし、フロントエンドと BFF を統合する構成。

- **BFF の役割**: バックエンド API 呼び出しの集約・レスポンス変換・認証トークン管理
- **Server Actions / API Routes** でトークンをサーバーサイドに保持し、クライアントへの認証情報露出を防ぐ
- **ローカル実現性**: ✅ `npm run dev` でそのまま起動可能。AWS 依存なし

| コンポーネント      | ローカル実現性 | ローカル代替手段             |
| ------------------- | -------------- | ---------------------------- |
| Next.js（BFF 含む） | ✅ 完全対応    | `npm run dev`                |
| ECS Fargate         | ✅ 不要        | ローカルで直接実行 or Docker |
| ECR                 | ✅ 不要        | ローカル Docker イメージ     |

### 認証 / API Gateway レイヤー

| コンポーネント         | ローカル実現性 | ローカル代替手段                                                                                                       |
| ---------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Amazon Cognito**     | △ 部分対応     | **cognito-local**（npm パッケージ）でユーザープールの基本的な認証フローをエミュレート。または JWT モックサーバーで代替 |
| **Amazon API Gateway** | ✅ 対応        | **LocalStack**（`localhost:4566`）でエミュレート。または Next.js BFF が直接バックエンドを呼ぶ構成でスキップ可能        |

### バックエンドレイヤー（Spring Boot on ECS）

| コンポーネント  | ローカル実現性 | ローカル代替手段                       |
| --------------- | -------------- | -------------------------------------- |
| **Spring Boot** | ✅ 完全対応    | `./mvnw spring-boot:run` または Docker |
| **ECS Fargate** | ✅ 不要        | ローカルで直接実行                     |
| **ECR**         | ✅ 不要        | ローカル Docker イメージ               |

### サーバーレス処理（Lambda）

| コンポーネント | ローカル実現性 | ローカル代替手段                                 |
| -------------- | -------------- | ------------------------------------------------ |
| **AWS Lambda** | ✅ 完全対応    | **LocalStack**（`localhost:4566`）でエミュレート |

### データベースレイヤー

| コンポーネント              | ローカル実現性 | ローカル代替手段                                 |
| --------------------------- | -------------- | ------------------------------------------------ |
| **Amazon RDS (PostgreSQL)** | ✅ 完全対応    | **Docker**（`docker run postgres`）で完全互換    |
| **Amazon DynamoDB**         | ✅ 完全対応    | **LocalStack**（`localhost:4566`）でエミュレート |
| **Amazon S3**               | ✅ 完全対応    | **LocalStack**（`localhost:4566`）でエミュレート |

---

## ローカル開発環境の構成概要

```mermaid
flowchart LR
    subgraph DC["🐳 Docker Compose"]
        direction TB
        N["<b>Next.js</b><br/>BFF + フロントエンド<br/>:3000"]
        SB["<b>Spring Boot</b><br/>バックエンド<br/>:8080"]
        PG[("<b>PostgreSQL</b><br/>:5432")]
        LS["<b>LocalStack</b><br/>S3 / DynamoDB<br/>:4566"]
    end
    CL["<b>cognito-local</b>（別途）<br/>Cognito のモック<br/>LocalStack Community 非対応のため"]

    N ==> SB
    SB ==> PG
    SB ==> LS
    N -. 認証 .-> CL

    classDef svc fill:#eff6ff,stroke:#3b82f6,color:#1e3a8a
    classDef store fill:#faf5ff,stroke:#a855f7,color:#581c87
    classDef mock fill:#fef2f2,stroke:#ef4444,color:#7f1d1d
    class N,SB svc
    class PG,LS store
    class CL mock
```

> LocalStack Community（無料）で Lambda・API Gateway・S3・DynamoDB をすべてカバー。  
> Cognito のみ cognito-local で補完する。

---

## 技術スタック一覧

| 区分                 | 技術 / サービス                          |
| -------------------- | ---------------------------------------- |
| フロントエンド + BFF | React, Next.js (App Router + API Routes) |
| バックエンド         | Java 25, Spring Boot 4.0, Flyway         |
| コンテナ             | Docker, Amazon ECS Fargate, Amazon ECR   |
| API 管理             | Amazon API Gateway (HTTP API)            |
| 認証                 | Amazon Cognito                           |
| AI/LLM               | Amazon Bedrock (Claude), Claude Code     |
| DB (RDB)             | Amazon RDS for PostgreSQL                |
| DB (NoSQL)           | Amazon DynamoDB                          |
| ストレージ           | Amazon S3                                |
| サーバーレス         | AWS Lambda (非同期・バッチ用途に限定)    |
| CI/CD                | GitHub Actions, Amazon ECR               |
| 監視                 | Amazon CloudWatch                        |
| IaC                  | Terraform                                |

---

## 応用・拡張オプション（プロジェクト判断）

プロジェクト要件に応じて以下を追加する。

- AWS WAF（Webアプリケーションファイアウォール）
- AWS X-Ray（分散トレーシング）
- Amazon ElastiCache / Redis（キャッシュ層）
- Amazon SES（メール送信）
- Amazon SNS / SQS（非同期メッセージング）

---

_このドキュメントはプロジェクト開始時の標準ベースラインとして使用する。_
