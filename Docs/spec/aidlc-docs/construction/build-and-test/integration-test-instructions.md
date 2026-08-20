---
type: spec
title: Integration Test Instructions - resource-keyword-filter
description: リソースキーワード検索機能の統合確認手順（AI-DLC Build and Test 成果物）
tags:
  - ai-dlc
  - build-and-test
  - resource
  - integration
timestamp: 2026-08-17
audience: 学習者・メンター
references:
  - backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java
  - frontend/src/app/(authenticated)/resources/page.tsx
---

# Integration Test Instructions - resource-keyword-filter

BookFlow はモノリシックな Spring Boot バックエンドと Next.js フロントエンド（BFF 層）の2層構成であり、マイクロサービス間の契約テストは対象外である。本ユニットにおける「統合確認」は次の2種類で構成する。

## 1. Controller-Service-Repository-DB 間の統合（自動化済み）

`ResourceControllerTest` は `@SpringBootTest` + `MockMvc` + H2 データベースにより、Controller から DB までを通した検証を行う。ユニットテストと同じコマンドで実行される。

```bash
cd backend
./gradlew test --tests "*ResourceControllerTest"
```

- 実データ（`insertSeedData()` で INSERT した `description` 列を含む行）に対する JPQL `search` クエリの実行結果を検証しており、モックでは検出できない SQL・JPQL の構文誤りやカラム名の不一致もここで検出される

## 2. フロントエンド↔バックエンド間の手動確認

キーワード検索は `ResourceFilterForm.tsx`（クライアント）→ URL クエリパラメータ → `page.tsx`（サーバーコンポーネント）→ `resources.ts`（Server Action）→ バックエンド `GET /api/resources` という経路を通る。この経路全体は自動テストでカバーされていない（`resources.test.ts` は MSW でバックエンド呼び出しをモックしている）ため、開発サーバーでの手動確認で経路の疎通を確認する。

### 手順

1. `docker compose -f .devcontainer/docker-compose.yml up -d` でローカルサービス（PostgreSQL 等）を起動する
2. `cd backend && ./gradlew bootRun` でバックエンドを起動する
3. `cd frontend && pnpm dev` でフロントエンドを起動する
4. サインイン画面の「開発専用ロール別ログインボタン」（`NODE_ENV !== 'production'` 時のみ表示）で MEMBER としてログインする
5. `/resources` 画面でキーワード検索欄に文字列を入力し「検索」を実行する
6. URL に `?keyword=...` が付与され、一覧が該当リソースのみに絞り込まれることを確認する
7. カテゴリフィルタと同時指定した場合に AND 条件で絞り込まれることを確認する
8. キーワード欄を空にして再検索し、`keyword` パラメータが URL から消え、フィルタ解除されることを確認する

この手順は Build and Test ステージの一環として実行し、結果を `build-and-test-summary.md` に記録する。
