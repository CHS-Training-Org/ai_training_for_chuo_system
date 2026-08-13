---
type: note
title: Code Generation Summary（resource-list-sort）
description: AI-DLC Code Generation ステージが完了したリソース一覧ソート機能の変更サマリー
tags:
  - ai-dlc
  - code-generation
  - summary
timestamp: 2026-08-13
---

# Code Generation Summary — リソース一覧ソート機能（Unit: resource-list-sort）

`Docs/spec/aidlc-docs/construction/plans/resource-list-sort-code-generation-plan.md` の全11ステップを実行した結果をまとめる。

## 変更ファイル（バックエンド）

- 変更：`backend/src/main/java/com/example/bookflow/domain/ResourceRepository.java`（ページング付きメソッド3本を削除し全件取得のみに整理）
- 変更：`backend/src/main/java/com/example/bookflow/application/ResourceService.java`（`list` を単線化し `resolveComparator` を追加）
- 変更：`backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`（許可フィールド検証・デフォルトソート明示）
- 変更：`backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`（既存2件のモック更新、新規7テスト追加）
- 変更：`backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`（新規6テスト追加）

## 変更ファイル（フロントエンド）

- 変更：`frontend/src/lib/labels.ts`（`RESOURCE_SORT_OPTIONS` 追加）
- 変更：`frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`（ソート選択 UI 追加）
- 変更：`frontend/src/app/(authenticated)/resources/page.tsx`（`sort` パラメータの受け渡し）
- 変更：`frontend/src/server/actions/resources.ts`（`ListResourcesParams.sort` 追加）
- 変更：`frontend/tests/unit/server/actions/resources.test.ts`（新規2テスト追加）

## テスト結果

- バックエンド：`./gradlew test` 全136件成功（既存テスト含む）
- バックエンド：`./gradlew spotlessApply` 適用済み、`spotlessCheck` 通過
- フロントエンド：`pnpm test resources` 13件成功、`pnpm lint` 通過、`pnpm build`（型チェック兼ねる）成功

## 設計変更の記録

Functional Design 完了時点では `from`/`to` 未指定時の一覧取得（旧・経路A）は `Pageable` を Repository にそのまま委譲する想定だったが、Code Generation Planning 着手前の実測により、DB 委譲では BR-03（`capacity` の null 末尾固定）・BR-05（`name` の大文字小文字非依存）を満たせないことが判明した。ユーザー確認のうえ、`from`/`to` 指定の有無によらず「候補リスト全件取得 → `Comparator` でソート → 手動ページネーション」の単一フローに統合する設計に変更した。経緯の詳細は `Docs/spec/aidlc-audit.md` の「Code Generation Planning 準備」節、設計内容は `Docs/spec/aidlc-docs/construction/resource-list-sort/functional-design/business-logic-model.md` を参照。

## 本ステージの対象外（後続作業）

次の更新は Build and Test 完了後、`/update-spec` で行う。

- `Docs/spec/api-spec.md` §`GET /api/resources`：`sort` クエリパラメータと有効値の追記
- `Docs/spec/screen-spec.md` §`/resources`：ソート選択 UI の追記
- `Docs/spec/enhancements/resource-list-sort.md`：受入条件からキーワード検索の組み合わせを除外、依存関係を「なし」に変更
- `Docs/spec/enhancements/resource-list-filter.md`：依存関係節から本課題を前提課題とする記述を削除
