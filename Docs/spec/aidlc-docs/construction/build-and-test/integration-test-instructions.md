---
type: spec
title: Integration Test Instructions - resource-keyword-filter
description: AI-DLC Build and Test ステージの成果物。resource-list-filter エンハンス課題の結合テスト方針
tags:
  - ai-dlc
  - build-and-test
  - resource
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - ../plans/resource-keyword-filter-code-generation-plan.md
---

# Integration Test Instructions - resource-keyword-filter

## 対象範囲

本課題は単一サービス（`backend`）内の縦切りスライスであり、サービス間結合（マイクロサービス間の契約）は存在しない。そのため「結合テスト」は、Controller → Service → Repository → H2 実DB を Spring コンテキスト経由で通す `ResourceControllerTest`（MockMvc・`@SpringBootTest` 相当の `BaseControllerTest`）がその役割を担う。`ResourceServiceTest`（Mockito）が Repository をモックする純粋な単体テストであるのに対し、こちらは JPQL クエリ（`ResourceRepository#search`）の実際の SQL 実行結果まで検証する。

## シナリオ：ResourceController → ResourceService → ResourceRepository（H2）

- **説明**: `GET /api/resources?keyword=...` が実際の DB に対して JPQL を実行し、期待通りのリソースのみを返すことを検証する
- **セットアップ**: `@BeforeEach` でシード投入（`ACTIVE_RESOURCE_ID`「第1会議室」、`INACTIVE_RESOURCE_ID`「旧備品A」、`DESC_MATCH_RESOURCE_ID`「サーバールーム」＋説明文「Wi-Fi対応・プロジェクター常備」）
- **テストケース**（`ResourceControllerTest`）:
  - `list_keywordMatchingName_returnsOnlyMatchingResource` — 名前一致（BR-01）
  - `list_keywordMatchingDescription_returnsOnlyMatchingResource` — 説明文一致（BR-01）
  - `list_keywordCaseInsensitive_matchesRegardlessOfCase` — 大文字小文字非区別（BR-02）
  - `list_blankKeyword_returnsAllActiveResources` — 空白のみ→条件解除（BR-03）
  - `list_keywordWithCategoryMismatch_returnsEmpty` — category との AND（BR-04）
  - `list_keywordNoMatch_returnsEmptyContent` — 非該当
- **期待結果**: 各テストケースのアサーション（`jsonPath` によるリソース ID の存在／非存在確認）どおり
- **クリーンアップ**: `@AfterEach` で全シードデータを削除（`DESC_MATCH_RESOURCE_ID` を含む）

## 結合テストの実行

```bash
cd backend
./gradlew test --tests "*ResourceControllerTest"
```

**確認済み結果**: 全テスト pass（既存の from/to・CRUD・権限系テストも含め回帰なし）。

## サービス間結合テスト・契約テスト

本課題では対象外（該当なし）。フロントエンドの `listResourcesAction`（Server Action）は MSW によるスタブで BE 接続を模擬しており、実 BE との結合確認は上記の `ResourceControllerTest` が代替する。
