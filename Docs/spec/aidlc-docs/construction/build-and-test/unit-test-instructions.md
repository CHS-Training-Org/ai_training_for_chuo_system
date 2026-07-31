---
type: spec
title: Unit Test Execution（resource-list-filter）
description: resource-list-filterユニットの単体テスト実行手順
tags:
  - ai-dlc
  - build-and-test
timestamp: 2026-07-19
references:
  - Docs/spec/aidlc-docs/construction/plans/resource-list-filter-code-generation-plan.md
---

# Unit Test Execution — resource-list-filter

汎用のビルド・テストコマンドは `CLAUDE.md`「よく使うコマンド」を参照。ここでは本ユニット固有の再現手順のみ記す。

## Backend

```bash
cd backend
./gradlew test --tests "*ResourceServiceTest" --tests "*ResourceControllerTest" --tests "*ResourceSpecificationsTest"
./gradlew test           # 全体回帰
./gradlew spotlessApply  # フォーマット
./gradlew checkstyleMain checkstyleTest
```

- **期待結果**: 全テストpass。checkstyleは既存の警告（テストメソッド名のアンダースコア命名・`ReservationRepository` の派生メソッド名）のみで、本ユニットの変更に起因する新規エラーはなし

## Frontend

```bash
cd frontend
pnpm test resources        # resources関連のみ
pnpm test                  # 全体回帰
pnpm lint
pnpm format:check
pnpm exec tsc --noEmit
```

- **期待結果**: 全テストpass。`format:check` は本ユニット対象外の `reservations/[id]/edit/page.tsx` に既存の未整形が残るが、本エンハンスの変更ファイルはすべて整形済み
