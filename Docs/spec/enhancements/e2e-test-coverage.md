---
type: spec
title: 既存機能の E2E テスト追加
description: 既存の予約機能に対して Playwright を使った E2E テストを追加するエンハンス課題のビジネス要求シート
tags: [spec, enhancement, e2e, testing, playwright]
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# 既存機能の E2E テスト追加

---

## 背景

BookFlow の Playwright テストは `frontend/tests/e2e/example.spec.ts` の 1 件のみ（「トップページが表示される」）で、主要なユーザーフローはまったくカバーされていません。

サインイン・予約申請・承認といった主要操作に対する E2E テストを追加することで、機能改修時のリグレッションを自動検出できるようにします。これは `ci-frontend.yml` の Playwright ステップ（`pnpm test:e2e`）が CI で動く基盤はすでに整っているため、テストシナリオを追加するだけで CI 保護が機能します。

## 要件

| # | 要件 |
|---|------|
| TEST-01 | USER ロールでのサインイン・サインアウトをシナリオとしてカバーする |
| TEST-02 | リソース一覧の閲覧・詳細確認のシナリオをカバーする（未サインインでのリダイレクト確認を含む） |
| TEST-03 | 予約申請フォームへの入力・送信（正常系）のシナリオをカバーする |
| TEST-04 | APPROVER ロールでの承認操作（承認・却下）のシナリオをカバーする |
| TEST-05 | 追加した E2E テストが `pnpm test:e2e` で全件 pass し、CI（`ci-frontend.yml`）で自動実行される |

## 受入条件

- [ ] `pnpm test:e2e` を実行すると、追加したシナリオがすべて pass する
- [ ] サインイン → リソース一覧閲覧 → 予約申請 のフローが 1 本のテストシナリオとして実行できる
- [ ] APPROVER ロールでサインインして承認操作を行うシナリオが実行できる
- [ ] 既存の `example.spec.ts` も引き続き pass する
- [ ] テストはフィクスチャ（`playwright.config.ts` の設定や `global-setup` 等）を活用してサインイン状態を共有し、重複を最小化している

## 影響範囲

- 対象レイヤー：frontend
- 更新が必要な spec：なし（テスト追加のみ。機能仕様に変更なし）

## AI 活用ポイント

- plan mode で「テストシナリオの分割粒度（ファイル・describe 構成）」を相談する
- 認証状態の共有方法（`storageState` / `global-setup`）を AI に確認する（Playwright の公式パターン）
- 開発用ロール別ログイン（`dev-auth.ts` の `signInAs` Action）を活用したテストセットアップを AI に提案させる
