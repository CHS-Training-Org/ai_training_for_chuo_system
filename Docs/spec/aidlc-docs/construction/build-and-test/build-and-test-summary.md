---
type: note
title: Build and Test Summary（resource-list-sort）
description: AI-DLC Build and Test ステージが生成したリソース一覧ソート機能のビルド・テスト結果サマリー
tags:
  - ai-dlc
  - build-and-test
  - summary
timestamp: 2026-08-13
---

# Build and Test Summary — リソース一覧ソート機能（Unit: resource-list-sort）

## テスト種別の判定

- **ユニットテスト**: 実施（`ResourceServiceTest`・`resources.test.ts`）
- **統合テスト**: 実施（`ResourceControllerTest`。Spring Boot + MockMvc + H2 による Controller〜Repository までの結合テストであり、ユニットテストと同一コマンドで実行される）
- **パフォーマンステスト**: SKIP。`requirements.md` の Non-Functional Requirements に「リソース件数は学習用途のため小規模と想定し、新規NFR設計は不要」と明記済み
- **契約テスト**: SKIP。マイクロサービス構成ではなく対象外
- **セキュリティテスト**: SKIP。認可ロジック（`@PreAuthorize`）・入力値検証（`ValidationException`）の変更なし。既存の `list_unregisteredUser_returns401` 等の認証・認可テストは変更せず継続して pass することを確認済み
- **E2Eテスト**: SKIP。本課題のスコープ外（Playwright E2E は `Docs/spec/enhancements/e2e-test-coverage.md` の対象）

## ビルド結果

| 対象 | コマンド | 結果 |
|---|---|---|
| バックエンド | `./gradlew compileJava compileTestJava` | 成功 |
| バックエンド（フォーマット） | `./gradlew spotlessApply` → `spotlessCheck` | 成功（初回は Javadoc の改行位置に違反があり `spotlessApply` で自動修正） |
| バックエンド（Checkstyle） | `./gradlew checkstyleMain checkstyleTest` | 成功（warning 139件。すべて本課題と無関係な既存メソッド名パターン。error なし） |
| フロントエンド | `pnpm build` | 成功（型チェック含む） |

## テスト結果

### バックエンド

- **コマンド**: `./gradlew test`
- **結果**: 全136件成功、失敗0件（既存テスト含む）
- **本課題での追加内訳**:
  - `ResourceServiceTest`: 新規7件（`list_sortByNameAsc_sortsCaseInsensitively` 等）
  - `ResourceControllerTest`: 新規6件（`list_sortByCapacityDesc_returnsNullsLast` 等）
- **レポート**: `backend/build/reports/tests/test/index.html`

### フロントエンド

- **コマンド**: `pnpm test resources`
- **結果**: 13件成功、失敗0件
- **本課題での追加内訳**: `resources.test.ts` に新規2件（`sort` パラメータの受け渡し・未指定時の非付与）
- **Lint**: `pnpm lint`（oxlint）成功

## 設計変更に伴う回帰テストの位置づけ

Code Generation Planning 時の実測（`aidlc-audit.md` 参照）で、DB の `ORDER BY capacity DESC` への単純委譲では PostgreSQL の既定により null が先頭に来ることが判明した。この事実を検出する目的で `list_sortByCapacityDesc_nullsLast`（`ResourceServiceTest`）・`list_sortByCapacityDesc_returnsNullsLast`（`ResourceControllerTest`）を追加しており、いずれも成功している。これにより、単一フロー統合後の実装が BR-03 を満たすことを確認済み。

## Overall Status

- **Build**: Success
- **All Tests**: Pass
- **Ready for Operations**: Yes
