---
type: note
title: Build and Test Summary（resource-list-filter）
description: AI-DLC Build and Test ステージが実測したリソース一覧キーワード検索機能のビルド・テスト結果サマリー
tags:
  - ai-dlc
  - build-and-test
  - summary
timestamp: 2026-09-03
---

# Build and Test Summary（リソース一覧の検索・フィルタ追加・Unit: resource-list-filter）

ビルド・テストの実行コマンド自体は #22（resource-list-sort）実施時から変更していない。新規のビルドツール・依存関係・環境変数は追加していないため手順書は再生成せず、本ファイルには実測結果のみを記録する（#22 が生成した手順書自体は、その後の #22 revert とドキュメント移行に伴い現在は存在しない）。

> 以下の実測値は、本課題を `learner/CHS-MIYATO-HIROYUKI/main`（Docusaurus 移行・#22 revert を含む）へマージしたうえでの結果に更新している（2026-09-04）。マージ前の初回実測（150件/96件）から母数が変わっているのは、無関係な #22 のテストがマージにより除去されたため。

## テスト種別の判定

- **ユニットテスト**: 実施（`ResourceServiceTest`・`resource-filter-form.test.ts`・`resources.test.ts`）
- **統合テスト**: 実施（`ResourceControllerTest`。Spring Boot + MockMvc + H2 による Controller〜Repository までの結合テストであり、ユニットテストと同一コマンドで実行される）
- **パフォーマンステスト**: SKIP。#22 と同一の根拠（`requirements.md` の Non-Functional Requirements に変更なし）
- **契約テスト**: SKIP。マイクロサービス構成ではなく対象外
- **セキュリティテスト**: SKIP。認可ロジック（`@PreAuthorize`）に変更なし。`list_unregisteredUser_returns401` 等の既存認証・認可テストが引き続き pass することを確認済み
- **E2Eテスト**: SKIP。本課題のスコープ外（`docs-next/docs/spec/enhancements/beginner/e2e-test-coverage.md` の対象）

## ビルド結果

| 対象 | コマンド | 結果 |
|---|---|---|
| バックエンド | `./gradlew test` | BUILD SUCCESSFUL |
| バックエンド（フォーマット） | `./gradlew spotlessCheck` | 成功（差分は既にフォーマット済みのため修正不要） |
| バックエンド（Checkstyle） | `./gradlew checkstyleMain checkstyleTest` | 成功（warning 139件。すべて本課題と無関係な既存メソッド名パターン、error なし） |
| フロントエンド | `pnpm build` | 成功（型チェック含む。`/resources` を含む全ルートが生成される） |
| フロントエンド（Lint） | `pnpm lint` | 成功（oxlint、エラーなし） |

## テスト結果

### バックエンド

- **コマンド**: `./gradlew test`
- **結果**: プロジェクト全体 136件成功、失敗0件
- **本課題での追加内訳**:
  - `ResourceServiceTest`: keyword 関連7件（`list_withKeywordMatchingName_returnsMatchingResourceOnly` 等）
  - `ResourceControllerTest`: keyword 関連5件（`list_withKeywordAndCategoryCombined_appliesBothFiltersWithAnd` 等）。同ファイル単体では26件成功
- **レポート**: `backend/build/reports/tests/test/index.html`

### フロントエンド

- **コマンド**: `pnpm test`（全体）
- **結果**: 全11ファイル89件成功、失敗0件
- **本課題での追加内訳**:
  - `resource-filter-form.test.ts`: 新規5件（`keyword` の URL 付与・空文字/空白時の解除・前後空白のtrim 等）
  - `resources.test.ts`: 新規2件（`keyword` パラメータの受け渡し・未指定時の非付与）

## 受入条件チェックとの対応

`docs-next/docs/spec/enhancements/beginner/resource-list-filter.md` の受入条件6件は、いずれも上記テストまたはコードの直接確認により充足を確認済み（対応表は `Docs/spec/aidlc-docs/construction/resource-list-filter/code/summary.md` を参照）。本リポジトリの運用として、既存の完了課題（例：`resource-list-sort.md`）でも受入条件のチェックボックス自体は未チェックのまま据え置く方式を踏襲しており、本シートも同様に据え置く。

## Overall Status

- **Build**: Success
- **All Tests**: Pass
- **Ready for Operations**: Yes
