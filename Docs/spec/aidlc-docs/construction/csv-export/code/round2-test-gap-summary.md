---
type: design
title: Round 2 Code Generation サマリ（csv-export テストギャップ対応）
description: PR #113 観点2 NGで指摘されたテストギャップに対する新規テスト2ファイルの完了サマリ
tags:
  - ai-dlc
  - code-generation
  - csv-export
timestamp: 2026-09-14
---

# Round 2 Code Generation サマリ（Unit: csv-export）

対応プラン: `Docs/spec/aidlc-docs/construction/plans/csv-export-round2-test-gap-code-generation-plan.md`

## 作成ファイル（新規、プロダクションコード無変更）

- **Created**: `frontend/tests/unit/lib/api-client.test.ts`
  - `getRaw` がバックエンドの403/200のいずれでも例外を投げず `Response`（status・ヘッダ）をそのまま返すことを検証（4テスト）
  - 対比として `get`（`assertOk` を通る既存メソッド）が404で `ApiClientError` を投げること・正常系でZodパース結果を返すことも検証
- **Created**: `frontend/tests/unit/app/api/reports/reservations/csv/route.test.ts`
  - セッションなし時にバックエンドを呼ばず401 JSONを返すこと（早期リターン）
  - バックエンドが200/403を返した場合に、status・`Content-Type`・`Content-Disposition`・ボディが透過転送されることを検証（3テスト）

## 健全性チェック（canary）

各テストが実際にロジックを検証していることを確認するため、対象コードを一時的に破壊 → 対応テストが失敗することを確認 → 元に戻す、という手順を実施した（プロダクションコードの差分は最終的にゼロ）。

| 破壊内容 | 結果 |
|---|---|
| `api-client.ts` の `getRaw` から `skipAssertOk: true` を除去（`assertOk` を通すよう変更） | `api-client.test.ts` の403系テストが失敗（`ApiClientError` が送出された） |
| `route.ts` のレスポンス組み立てで `status: backendResponse.status` を `status: 200` に固定 | `route.test.ts` の403転送テストが失敗（`expected 200 to be 403`） |

いずれも復元後、全テストが再び成功することを確認済み。

## テスト結果

`pnpm test` 全体: 100件成功（Round 1時点の93件 + 本ラウンドで追加した7件）。
`pnpm lint`（oxlint）: エラーなし。
`pnpm format:check`（oxfmt）: 初回1件の整形差分を検出（`pnpm format` で自動修正・再チェックで解消）。
