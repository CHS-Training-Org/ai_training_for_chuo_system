---
type: note
title: Code Quality Assessment（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成したコード品質評価（issue #22関連範囲）
tags:
  - ai-dlc
  - reverse-engineering
timestamp: 2026-08-07
---

# Code Quality Assessment

## Test Coverage

- **Overall**: Good（リソース機能はController/Service双方にテストが存在）
- **Unit Tests**: `ResourceServiceTest`（重複判定・一覧・取得・空き確認の`@Nested`構成）、`ResourceControllerTest`（約25メソッド）、`frontend/tests/unit/server/actions/resources.test.ts`
- **Integration Tests**: backend は H2 を使った Service/Controller テストが実質的に統合テストを兼ねる
- **並び替え機能のテスト**: 現状ゼロ（`sort`関連のテストケースは backend・frontend いずれにも存在しない）。issue #22 実装時に新規追加が必要

## Code Quality Indicators

- **Linting**: 設定済み（frontend: oxlint、backend: Checkstyle `isIgnoreFailures = false` でCI必須）
- **Code Style**: 一貫（backend は Spotless + Google Java Format で強制、frontend は既存コンポーネントパターン（`Select`/`Input`等）への追随が容易）
- **Documentation**: Fair〜Good（`Docs/spec/api-spec.md`・`screen-spec.md`が存在するが、現状 `sort` パラメータ・UIの記載はなく更新が必要）

## Technical Debt

- `ResourceService.listWithAvailabilityFilter`（`from`/`to`指定時の手動ページネーション経路）はソートを一切適用していない。issue #22 の受入条件「カテゴリ・期間フィルタとの組み合わせでもソートが適用される」を満たすには、この経路にソート処理を個別実装する必要があり、`listPaginated`（Spring Data標準の`Pageable`委譲）との実装の非対称性が残る
- `ResourceRepository` に `Sort` を単体で受け取るメソッドが存在しないため、全件取得系（`fetchAllCandidates`が呼ぶメソッド）はDB側でソート順を保証できない

## Patterns and Anti-patterns

- **Good Patterns**: BFF層でのパラメータ組み立ての一元化（`resources.ts`）、Controller/Service/Repositoryの責務分離、Bean Validationによる入力チェック
- **Anti-patterns**: 一覧取得ロジックが「標準Pageable委譲」と「手動ページネーション」の2経路に分岐しており、片方にのみ機能追加すると考慮漏れが起きやすい構造（実際、issue #22 のソート適用はこの2経路両方への対応が必要）
