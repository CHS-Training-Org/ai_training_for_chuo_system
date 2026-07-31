---
type: spec
title: Architecture（Reverse Engineering・最小深度）
description: resource-list-filter エンハンス着手のためのアーキテクチャ概要。既存ドキュメントへの参照が中心
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-07-19
references:
  - Docs/ARCHITECTURE.md
  - Docs/spec/api-spec.md
---

# System Architecture

> **深度メモ**: システム全体構成図・レイヤー設計方針は [`Docs/ARCHITECTURE.md`](../../../../ARCHITECTURE.md) に既存。ここでは重複せず、今回変更対象のレイヤー・コンポーネントだけを述べる。

## System Overview

BookFlow は Next.js（フロントエンド兼 BFF）と Spring Boot（バックエンド）の 2 層構成で、フロントエンドの Server Actions が BFF として Spring Boot の REST API を呼び出す。詳細は [`Docs/ARCHITECTURE.md`](../../../../ARCHITECTURE.md) を参照。

## 本エンハンスで変更するコンポーネント

| コンポーネント | レイヤー | 変更内容 |
|---|---|---|
| `ResourceController` | presentation（backend） | `GET /api/resources` に `keyword` クエリパラメータ追加 |
| `ResourceService` | application（backend） | キーワード条件を絞り込みロジックに組み込む |
| `ResourceRepository` | domain（backend） | キーワード検索クエリの追加（設計判断は Workflow Planning／Code Generation で確定） |
| `listResourcesAction` | Server Actions（frontend BFF） | `keyword` パラメータの受け渡し追加 |
| `ResourceFilterForm` | UI コンポーネント（frontend） | キーワード入力フィールド追加 |
| `ResourcesPage` | ページ（frontend） | `searchParams.keyword` の受け渡し追加 |

## Data Flow（今回変更される経路のみ）

```mermaid
sequenceDiagram
    participant U as 利用者
    participant Page as ResourcesPage
    participant Form as ResourceFilterForm
    participant Action as listResourcesAction
    participant API as ResourceController
    participant Svc as ResourceService
    participant Repo as ResourceRepository

    U->>Form: キーワード入力+送信
    Form->>Page: URL searchParams (keyword付与)
    Page->>Action: listResourcesAction(keyword,...)
    Action->>API: GET /api/resources?keyword=...
    API->>Svc: list(category,from,to,keyword,isAdmin,pageable)
    Svc->>Repo: 絞り込みクエリ実行
    Repo-->>Svc: Resourceページ
    Svc-->>API: ResourceResponseページ
    API-->>Action: JSON
    Action-->>Page: ResourceResponseページ
    Page-->>U: 一覧再描画
```

## Integration Points

- 変更なし（外部 API・DB 以外の連携先はこのエンハンスでは増えない）
