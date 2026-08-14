---
type: note
title: Unit Test Execution Instructions（resource-list-sort）
description: AI-DLC Build and Test ステージが生成したリソース一覧ソート機能のユニットテスト実行手順
tags:
  - ai-dlc
  - build-and-test
timestamp: 2026-08-13
---

# Unit Test Execution — リソース一覧ソート機能

## バックエンド

```bash
cd backend
./gradlew test
./gradlew spotlessCheck checkstyleMain checkstyleTest
```

- **期待結果**: 全テスト成功（本課題の変更範囲では `ResourceServiceTest` に新規7件、`ResourceControllerTest` に新規6件を追加）
- **テストレポート**: `backend/build/reports/tests/test/index.html`
- **Checkstyle レポート**: `backend/build/reports/checkstyle/`（本課題と無関係な既存メソッド名の warning が出るが、error ではないため許容する）

## フロントエンド

```bash
cd frontend
pnpm test resources
pnpm lint
```

- **期待結果**: `resources.test.ts` 全テスト成功（本課題の変更範囲では `sort` パラメータの受け渡しを検証する新規2件を追加）
- **Lint**: `oxlint .` がエラーなく完了すること

## テストが失敗した場合

1. `./gradlew test`（バックエンド）または `pnpm test`（フロントエンド）の出力で失敗箇所を特定する
2. `Docs/spec/aidlc-docs/construction/resource-list-sort/functional-design/business-rules.md`（BR-01〜06）と実装（`ResourceService.resolveComparator`）を照合する
3. 修正後、該当テストのみ再実行して確認してから全体を再実行する
