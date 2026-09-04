---
type: note
title: Code Generation Summary（resource-list-filter）
description: リソース一覧キーワード検索機能について、AI-DLC トラッキング外で先行完了していた実装を遡及的に検証したサマリー
tags:
  - ai-dlc
  - code-generation
  - summary
timestamp: 2026-09-03
---

# Code Generation Summary（リソース一覧の検索・フィルタ追加・Unit: resource-list-filter）

本ユニットの実装は、`/aidlc` の Code Generation ステージ（Part 1: 計画立案 → Part 2: 生成の実行）を経ずに、コミット `e342a96`・`2bbc15b`・`5685d42` として先行完了していた。このサマリーは実装済みのコードを事後に読み、`docs-next/docs/spec/enhancements/beginner/resource-list-filter.md` の要件・受入条件との対応を検証した結果を記録するものであり、実装に先立つ計画書ではない。

## 変更ファイル（仕様・コミット `e342a96`。マージ時に docs-next へ移植）

- 変更：`docs-next/docs/spec/api-spec.md`（`GET /api/resources` に `keyword` パラメータを追記）
- 変更：`docs-next/docs/spec/requirements.md`（RES-09 追加。当初は RES-10 だったが、マージ時に #22（resource-list-sort）の revert により空いた番号へ振り直した）
- 変更：`docs-next/docs/spec/screen-spec.md`（キーワード検索欄の UI 要素を追記）

## 変更ファイル（バックエンド・コミット `2bbc15b`）

- 変更：`backend/src/main/java/com/example/bookflow/application/ResourceService.java`（`list` に `keyword` 引数を追加し、`filterByKeyword` を新設。`Locale.ROOT` での大文字小文字非依存の部分一致判定）
- 変更：`backend/src/main/java/com/example/bookflow/presentation/ResourceController.java`（`keyword` クエリパラメータを追加し `resourceService.list` に委譲）
- 変更：`backend/src/test/java/com/example/bookflow/application/ResourceServiceTest.java`（新規7テスト追加）
- 変更：`backend/src/test/java/com/example/bookflow/presentation/ResourceControllerTest.java`（新規5テスト追加）

## 変更ファイル（フロントエンド・コミット `5685d42`）

- 変更：`frontend/src/app/(authenticated)/resources/ResourceFilterForm.tsx`（キーワード入力欄を追加、`buildResourceFilterQuery` に `keyword`（trim後、空なら未付与）を追加）
- 変更：`frontend/src/app/(authenticated)/resources/page.tsx`（`keyword` パラメータの受け渡し）
- 変更：`frontend/src/server/actions/resources.ts`（`ListResourcesParams.keyword` 追加）
- 変更：`frontend/tests/unit/resource-filter-form.test.ts`（新規5テスト追加）
- 変更：`frontend/tests/unit/server/actions/resources.test.ts`（新規2テスト追加）

## 要件・受入条件との対応（検証結果）

| 要件・受入条件 | 実装箇所 | 判定 |
|---|---|---|
| RES-01（`keyword` パラメータで `name`/`description` を部分一致絞り込み） | `ResourceController.list` → `ResourceService.filterByKeyword` | 充足 |
| RES-02（大文字小文字を区別しない） | `filterByKeyword` の `Locale.ROOT` 変換比較 | 充足 |
| RES-03（`ResourceFilterForm` にキーワード入力欄、送信時に URL パラメータ付与） | `ResourceFilterForm.tsx` の `keyword` フィールドと `buildResourceFilterQuery` | 充足 |
| RES-04（カテゴリ・期間フィルタと AND 条件） | `ResourceService.list` 内で `fetchAllCandidates` → `filterByKeyword` → 占有判定除外の直列適用（`listFiltered`） | 充足 |
| 受入条件：キーワード未入力で条件解除 | `buildResourceFilterQuery` の `if (keyword && keyword.trim())` 判定 | 充足 |
| 受入条件：`keyword` 未指定時は既存動作（全件取得）を維持 | `filterByKeyword` の `if (keyword == null \|\| keyword.isBlank())` 早期リターン | 充足 |

## テスト結果（Build and Test ステージで実測）

実行結果の詳細は `Docs/spec/aidlc-docs/construction/resource-list-filter/build-and-test/summary.md` を参照。バックエンド・フロントエンドとも全テスト成功。

## 設計判断の踏襲

`filterByKeyword` は DB の `ILIKE` 等の委譲ではなく候補リスト取得後に Java 側で判定する設計を取っている。これは #22（resource-list-sort）の `resolveComparator` が確立した「DB のロケール・NULLS 順序既定に結果が依存しないよう、候補リスト取得後にアプリケーション側で処理する」パターンをそのまま踏襲したものであり、`ResourceService.java` の Javadoc（`list` メソッドのコメント）にも明記されている。この踏襲により、本ユニットでは Functional Design ステージを独立実施せず SKIP と判定した（判断根拠は `aidlc-audit.md` 参照）。

なお #22（resource-list-sort）自体はその後 main 上で revert されており（選択課題を運営側が実装してしまったための取り消し）、`resolveComparator`・`ResourceSortField` は現在のコードベースには存在しない。上記は本課題の設計判断の由来を示す記録であり、参照先の実装が現存することを示すものではない。
