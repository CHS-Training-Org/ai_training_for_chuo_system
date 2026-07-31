---
type: spec
title: Code Structure（Reverse Engineering・Resourceドメイン詳細）
description: resource-list-filter エンハンス対象ファイルの詳細インベントリと既存パターン
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-07-19
references:
  - backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java
  - backend/src/main/java/com/example/bookflow/application/ResourceService.java
---

# Code Structure

> **深度メモ**: ビルドシステム全体は [`Docs/ARCHITECTURE.md`](../../../../ARCHITECTURE.md) §技術スタック一覧を参照。ここでは Resource ドメイン（今回の変更対象）だけを詳述する。

## Build System

- Backend: Gradle（Kotlin DSL）、Spring Boot 4.0 / Java 25
- Frontend: pnpm、Next.js 15（App Router）

## Existing Files Inventory（変更対象・関連ファイルのみ）

### Backend

- `backend/src/main/java/com/example/bookflow/presentation/ResourceController.java` — `GET /api/resources` は `category`・`from`・`to`・`Pageable` を受け取り、`isAdmin` 判定を行って `ResourceService.list` に委譲する。`from`/`to` は同時指定必須のバリデーションを持つ。
- `backend/src/main/java/com/example/bookflow/application/ResourceService.java` — `list()` が `from`/`to` の有無で `listPaginated`（DB ページネーション）と `listWithAvailabilityFilter`（全件取得後 Java 側で重複判定・手動ページネーション）に分岐する。両経路とも `fetchAllCandidates`/`listPaginated` 内部で `ResourceRepository` の派生クエリメソッドを呼ぶ。
- `backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java` — `JpaRepository` 派生。カテゴリ×`isActive`の組み合わせごとに個別の派生クエリメソッド（`findByCategory`, `findByCategoryAndIsActiveTrue`, `findByIsActiveTrue`, `findAll`）をページネーション有り/無しの2形態で持つ（既に4メソッド×2形態=8メソッド近い組み合わせ）。
- `backend/src/main/java/com/example/bookflow/domain/Resource.java` — エンティティ。`name`（必須）・`description`（null可）・`category`・`capacity`・`location`・`requiresApproval`・`isActive` フィールドを持つ。今回の検索対象は `name`・`description`。
- `backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java` / `ResourceControllerTest.java` — 既存テストパターン（`@Test` + `@DisplayName` なしの説明的メソッド名、`setField` によるリフレクション初期化）。

### Frontend

- `frontend/src/app/(authenticated)/resources/page.tsx` — Server Component。`searchParams`（`category`/`from`/`to`/`page`）を `listResourcesAction` に渡し、`ResourceFilterForm` に `default*` props を渡す。
- `frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx` — Client Component。`FormData` から値を読み `URLSearchParams` を組み立てて `router.push` する。
- `frontend/src/server/actions/resources.ts` — `listResourcesAction` が `ListResourcesParams` を組み立てて `client.getPaginated("/resources", ...)` を呼ぶ。

## 設計パターン（今回の実装が従うべきもの）

### 派生クエリメソッドの組み合わせ爆発（懸念点）

- **所在**: `ResourceRepository`
- **内容**: カテゴリ×`isActive` の組み合わせで既に4種類×ページネーション有無で実質8メソッドが存在する。ここに `keyword` を単純に派生メソッド名で追加すると（例: `findByCategoryAndIsActiveTrueAndNameContainingIgnoreCase`）組み合わせがさらに倍増する。
- **対応方針の選択肢**（Workflow Planning / Code Generation で確定）:
  1. `JpaSpecificationExecutor` + `Specification` を導入し、`category`/`isActive`/`keyword` を動的に AND 合成する
  2. `@Query` によるカスタム JPQL で null 許容条件（`:keyword IS NULL OR ...`）を1メソッドに集約する
  - 業務要求シートの「AI 活用ポイント」にも同じ論点が明記されている

### Java 側後処理パターン（`from`/`to` フィルタ）

- **所在**: `ResourceService.listWithAvailabilityFilter`
- **内容**: 空き確認フィルタは DB クエリではなく全件取得後 Java 側で判定する既存パターン。keyword 追加後もこの構造は変えず、`fetchAllCandidates` の中で keyword 条件を追加するのが既存パターンとの整合性が高い。

## Critical Dependencies

- Spring Data JPA（派生クエリメソッド・`JpaSpecificationExecutor` とも標準サポート）
- PostgreSQL（`ILIKE` による大文字小文字無視の部分一致が利用可能。H2 テスト環境でも `LOWER()` 変換で代替可能）
