---
type: design
title: Round 2 要件（PR #113 観点2 テストギャップ対応）
description: Issue #29 CSV帳票出力の追加ラウンド。PRレビュー観点2で指摘されたBFF層テスト欠落への対応要件
tags:
  - ai-dlc
  - requirements
  - csv-export
timestamp: 2026-09-14
---

# Round 2 要件（PR #113 観点2 テストギャップ対応）

## Intent Analysis Summary

- **User Request**: PR #113 の AI レビュー（観点2「実装と非機能部分の整合性」、ラウンド1、判定NG）で指摘された、フロントエンド BFF 層の新規ロジックに対するテスト欠落を解消する。
- **Request Type**: Enhancement（既存実装への対応するテスト追加。仕様・挙動の変更は伴わない）
- **Scope Estimate**: Single Component（`frontend/` の BFF 層。具体的には `src/lib/api-client.ts` と `src/app/api/reports/reservations/csv/route.ts` の2ファイルに対する新規テストファイル追加）
- **Complexity Estimate**: Simple（新規ロジックの実装ではなく、既存の確定済み挙動を検証するテストの追加のみ）

## 依拠する情報源

- PR #113 会話コメント（`gh api repos/.../issues/113/comments`、id `5643743991`「観点2」・id `5643747301`「サマリ」）
- 本セッション内でのソースコード読解によるQ&A（`api-client.ts`の`getRaw`/`assertOk`分岐、`route.ts`の401分岐・ヘッダ転送範囲、`CsvExportControls.tsx`の`toIsoWithSeconds`）
- advisor 相談によるスコープ確定

## requirement-verification-questions.md を作成しない理由

要求はPRレビューのNG判定本文に「次のアクション」として具体的に明記されており（対象ファイル・対象ロジック・検証すべき振る舞いまで特定済み）、曖昧性がないため `common/requirements-analysis.md` Step 6 の「requirements are exceptionally clear and complete」に該当すると判断し、質問ファイルの作成をスキップする。

## 機能要件

| ID | 要件 | 検証方法 |
|---|---|---|
| RG2-01 | `api-client.ts` の `getRaw` は、バックエンドが4xx/5xxを返した場合でも例外を投げず、そのステータス・ボディを持つ `Response` をそのまま返すことをテストで検証する | MSWで `/api/backend/reports/reservations/csv` に403を返すハンドラを用意し、`getRaw` の戻り値の `status`/`ok` を検証。対比として `get`（`assertOk`を通る通常メソッド）が同条件で `ApiClientError` を投げることも確認する |
| RG2-02 | `route.ts` は、セッションがない場合にバックエンドを呼び出さず401 JSON（`{code: "UNAUTHORIZED", ...}`）を返すことをテストで検証する | `@/lib/session` の `getSession` をモックし `null` を返させ、バックエンド用MSWハンドラが呼ばれていないこと・レスポンスが401であることを確認する |
| RG2-03 | `route.ts` は、バックエンドが返した `status`（200/403等）と `Content-Type`・`Content-Disposition` ヘッダをそのまま呼び出し元に転送することをテストで検証する | MSWで200（CSV本文・Content-Type/Content-Disposition付き）と403（JSONエラー）の2パターンを用意し、`route.ts` の `GET` を直接呼び出してレスポンスの `status`・該当ヘッダ・ボディを検証する |

## 非機能要件・制約

- **スコープ外（変更しない）**: ヘッダ転送範囲を「Content-Type・Content-Disposition の2つのみ」に限定する現行実装、および `CsvExportControls.tsx` の `toIsoWithSeconds` が16文字以外を無変換で通す現行実装。いずれもPRレビュー（観点1 OK・観点3 ユーザー回答済み）で既知・現状維持と扱われているため、本ラウンドでは**テスト追加のみ**とし実装変更は行わない。
- **既存テストとの整合**: `tests/unit/msw/handlers.ts`（共有ハンドラ）は変更せず、403/200のバリエーションは `server.use(...)` によるテスト単位のオーバーライドとする（他テストへの副作用を避ける）。
- **テスト実行環境**: `vitest.config.ts` の既定環境は `jsdom`（`_isServer` は `false` 判定となり、リクエスト先プレフィックスは `/api/backend/*`）。既存のMSWハンドラ・Server Action系テストと同じ環境・同じプレフィックス規約に合わせる（`@vitest-environment node` は使わない）。
- **Lint/Format**: 新規テストファイルは `pnpm lint`（oxlint）・`pnpm format:check`（oxfmt）に適合させる。

## サマリ

本ラウンドは、Issue #29（CSV帳票出力）のPRレビューで検出された「新規ロジックは存在するが検証されていない」というギャップ（観点2 NG）を解消するための、テスト追加のみの小規模な追加ラウンドである。対象は `api-client.ts` の `getRaw`（エラー透過ロジック）と `route.ts`（未認証時401分岐・status/ヘッダ透過転送）の2ファイル。既存の実装・仕様は変更しない。
