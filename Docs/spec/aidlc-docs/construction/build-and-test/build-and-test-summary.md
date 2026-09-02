---
type: spec
title: Build and Test Summary - resource-keyword-filter
description: AI-DLC Build and Test ステージの成果物。resource-list-filter エンハンス課題のビルド・テスト結果サマリ
tags:
  - ai-dlc
  - build-and-test
  - resource
timestamp: 2026-09-02
audience: 学習者・メンター
references:
  - build-instructions.md
  - unit-test-instructions.md
  - integration-test-instructions.md
---

# Build and Test Summary - resource-keyword-filter

## ビルド状況

| 対象 | ツール | 結果 |
|---|---|---|
| バックエンド | Gradle（`compileJava`/`compileTestJava`） | ✅ Success |
| フロントエンド | pnpm（`next build`） | ✅ Success（型チェック・11 ページ静的生成含む） |

## テスト実行結果

### ユニットテスト

| 対象 | テストクラス／ファイル | 結果 |
|---|---|---|
| バックエンド（Mockito） | `ResourceServiceTest`（`List_`） | ✅ 5/5 pass（新規1件含む） |
| フロントエンド（Vitest） | `resources.test.ts` 他9ファイル | ✅ 81/81 pass（新規1件含む） |

### 結合テスト

| 対象 | テストクラス | 結果 |
|---|---|---|
| バックエンド（H2 実DB・MockMvc） | `ResourceControllerTest` | ✅ 全件 pass（keyword 関連6件を含む） |

### 静的解析・フォーマット

| 対象 | ツール | 結果 |
|---|---|---|
| バックエンド | `checkstyleMain`/`checkstyleTest` | ✅ Success（`MethodName` 警告は既存事象。build-instructions.md 参照） |
| バックエンド | `spotlessApply` | ✅ 適用済み |
| フロントエンド | `oxlint` | ✅ 違反なし |
| フロントエンド | `oxfmt --check` | ✅ 違反なし |

### 対象外の試験種別

- **性能テスト**: Requirements Analysis で新規 NFR なしと確認済みのため対象外
- **契約テスト**: マイクロサービス間結合なし（単一サービス内の縦切りスライス）のため対象外
- **セキュリティテスト**: 認可ルール（ADMIN/一般の可視性）を変更していないため新規の観点なし
- **E2E テスト**: 既存の `frontend/tests/e2e/` にリソース一覧の E2E がある場合は範囲外（本課題のスコープ外。選択課題「既存機能の E2E テスト追加」の対象）

## 総合ステータス

- **ビルド**: Success
- **全テスト**: Pass
- **Operations（CI 品質ゲート）への準備**: Ready
