---
type: spec
title: Build and Test Summary - resource-keyword-filter
description: リソースキーワード検索機能のビルド・テスト結果サマリ（AI-DLC Build and Test 成果物）
tags:
  - ai-dlc
  - build-and-test
  - resource
  - summary
timestamp: 2026-08-17
audience: 学習者・メンター
references:
  - Docs/spec/aidlc-docs/construction/build-and-test/build-instructions.md
  - Docs/spec/aidlc-docs/construction/build-and-test/unit-test-instructions.md
  - Docs/spec/aidlc-docs/construction/build-and-test/integration-test-instructions.md
---

# Build and Test Summary - resource-keyword-filter

## ビルド結果

| 対象 | コマンド | 結果 |
|---|---|---|
| バックエンド | `./gradlew clean build` 相当（`test`／`spotlessCheck`／`checkstyleMain`） | 成功 |
| フロントエンド | `pnpm build` 相当（`pnpm lint`／`pnpm format:check`／`pnpm test`） | 成功 |

`checkstyleMain` に既存警告2件（`ReservationRepository.java` の `MethodName` ルール）が出るが、本ユニットと無関係な既存コード由来のため対象外とした。

## ユニットテスト結果

| 対象 | 件数 | 結果 |
|---|---|---|
| バックエンド（`./gradlew test`） | 131件 | 全件 pass |
| フロントエンド（`pnpm test`） | 81件 | 全件 pass |

## 統合確認（実機 PostgreSQL）

自動テスト（H2）はすべて pass していたが、`integration-test-instructions.md` の手順に従い実際に PostgreSQL・Next.js 開発サーバーを起動してブラウザ操作で確認したところ、`GET /api/resources` が `keyword` の値に関わらず（未指定時を含む）常に `500 Internal Server Error` を返す不具合を検出した。

### 検出した不具合と原因

- **事象**: バックエンドログに `ERROR: function lower(bytea) does not exist` が出力され、リソース一覧 API が例外を返す
- **原因**: `ResourceRepository.search` の JPQL で `CONCAT('%', :keyword, '%')` を `LIKE` に渡す際、`:keyword` に `null` を bind すると PostgreSQL JDBC ドライバが型を推論できず `bytea` として扱ってしまい、`LOWER()` の引数型不一致でエラーになる。H2 はこの型不整合を許容するため、既存のユニットテスト・`ResourceControllerTest`（H2 使用）ではいずれも検出できなかった
- **修正**: `CONCAT('%', :keyword, '%')` の `:keyword` を `CAST(:keyword AS string)` に変更し、`null` の場合でも明示的に文字列型を PostgreSQL に伝えるようにした（`ResourceRepository.java`）。あわせて、当初 `LOWER(COALESCE(r.description, ''))` としていた `description` の null 処理も `(r.description IS NOT NULL AND LOWER(r.description) LIKE ...)` に変更し、`COALESCE` に起因する型推論の余地自体を排除した
- **再検証**: 修正後、実機 PostgreSQL 上でキーワード未指定・キーワード指定（name 一致／description のみ一致／category との AND 条件）・キーワード解除のいずれもブラウザ操作で意図通りに動作することを確認した。修正後もバックエンド 131 件・フロントエンド 81 件のユニットテストは全件 pass のまま

### ブラウザでの確認手順と結果

`integration-test-instructions.md` の手順1〜8を実施した。

| 確認項目 | 結果 |
|---|---|
| MEMBER としてログイン | 成功 |
| keyword=`第1` で検索 → URL に `?keyword=%E7%AC%AC1` が付与され「第1会議室」のみ表示 | 一致 |
| keyword=`第1` + category=`EQUIPMENT` の AND 条件 → 該当なし（「リソースがありません」） | 一致 |
| keyword を空にして再検索 → URL から `keyword` が消えフィルタ解除 | 一致 |
| description のみに含まれる語（`承認不要`）での検索 → 「プロジェクターA」「社用車A」が一致 | 一致 |
| ブラウザコンソール・ページエラー | なし |

## 静的解析・フォーマット

| 対象 | 結果 |
|---|---|
| `spotlessCheck`（バックエンド） | 成功（初回検出した改行整形違反2件は `spotlessApply` で修正済み） |
| `checkstyleMain`（バックエンド） | 成功（既存警告2件は対象外） |
| `oxlint`（フロントエンド） | 成功 |
| `oxfmt --check`（フロントエンド） | 成功 |

## Overall Status

- **Build**: Success
- **All Tests**: Pass（バックエンド131件・フロントエンド81件）
- **実機統合確認**: Pass（不具合1件検出・修正・再確認済み）
- **Ready for Operations**: Yes
