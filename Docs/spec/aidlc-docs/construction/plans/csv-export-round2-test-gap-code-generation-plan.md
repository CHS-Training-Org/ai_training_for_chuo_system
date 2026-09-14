---
type: design
title: Round 2 Code Generationプラン（csv-export テストギャップ対応）
description: PR #113 観点2 NGで指摘された2ファイルへのテスト追加の実行計画
tags:
  - ai-dlc
  - code-generation
  - csv-export
timestamp: 2026-09-14
---

# Round 2 Code Generation プラン（Unit: csv-export）

## Unit Context

- **対象ユニット**: csv-export（Issue #29、既存ユニットの追加ラウンド）
- **対応する要件**: RG2-01・RG2-02・RG2-03（`round2-test-gap-requirements.md`）
- **依存関係**: なし（既存実装への追加テストのみ、プロダクションコード変更なし）
- **コード配置**: Workspace root（`frontend/tests/unit/` 配下）

## Steps

- [x] **Step 1: Frontend Components Unit Testing — `api-client.ts` の `getRaw`**
  - 対象: `frontend/tests/unit/lib/api-client.test.ts`（新規作成）
  - 内容: RG2-01 に対応。MSWで `/api/backend/reports/reservations/csv` に403 JSONエラーを返すハンドラを `server.use()` で設定し、`getRaw` が例外を投げず `status: 403` の `Response` を返すことを検証。対比として同条件で `get`（`assertOk`を通る既存メソッド）が `ApiClientError` を投げることも検証する
  - 実行環境: `vitest.config.ts` 既定の `jsdom`（`@vitest-environment` 指定なし）。既存の `tests/unit/msw/handlers.ts` は変更しない

- [x] **Step 2: Frontend Components Unit Testing — `route.ts`（Route Handler）**
  - 対象: `frontend/tests/unit/app/api/reports/reservations/csv/route.test.ts`（新規作成）
  - 内容: RG2-02・RG2-03 に対応。
    - `@/lib/session` の `getSession` をモックし `null` を返すケースで、バックエンド用MSWハンドラが呼ばれないこと・レスポンスが401 JSON（`{code: "UNAUTHORIZED", ...}`）であることを検証
    - セッションありのケースで、MSWが200（CSV本文・`Content-Type`・`Content-Disposition`付き）を返す場合と403（JSONエラー）を返す場合の両方について、`route.ts` の `GET` を直接呼び出し、返る `Response` の `status`・`Content-Type`・`Content-Disposition`・ボディが透過転送されていることを検証
  - セッションモックは既存規約（`tests/unit/server/actions/*.test.ts`）に倣い `vi.mock("@/lib/session")` を使用

## Story Traceability

新規ユーザーストーリーなし（既存実装Issue #29のPRレビュー指摘対応のため、Requirements Analysisの要件RG2-01〜03に直接対応）。

## Documentation

本プランおよび完了サマリは `Docs/spec/aidlc-docs/construction/csv-export/code/round2-test-gap-summary.md` に記録する（Step完了後に作成）。
