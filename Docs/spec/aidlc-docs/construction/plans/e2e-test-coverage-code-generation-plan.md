# Code Generation Plan — ユニット: e2e-test-coverage（既存機能の E2E テスト追加）

## Unit Context

- **Stories implemented**: なし（User Stories は SKIP 判定済み。`requirements.md` の TEST-01〜05 を直接の実装対象とする）
- **Dependencies**: なし（前提課題なし、他ユニットとの競合なし）
- **Database entities owned**: なし（テスト追加のみ、スキーマ変更なし）
- **Service boundaries**: frontend の `tests/e2e/` 配下に閉じる。アプリケーションコード（`src/`）は変更しない

## 技術判断（Functional Design を SKIP したため、本計画で直接規定する）

- **認証状態の共有**: `global-setup.ts` で MEMBER・APPROVER 各ロールにつき、実際にブラウザで `/auth/signin` を開き開発用ロールログインボタンをクリックしてサインインし、`storageState` を `tests/e2e/.auth/{role}.json` に保存する。各テストファイルは `test.use({ storageState: ... })` で必要なロールの認証済み状態を読み込む（`playwright.config.ts` に `globalSetup` を追加）。`storageState` の出力先はテスト実行のたびに再生成されるため `.gitignore` に追加する
- **サインアウト検証**（TEST-01）: `context.clearCookies()` で `dev-id-token` を削除し、保護ページへのアクセスで `/auth/signin` へリダイレクトされることを確認する（requirements.md の決定どおり、アプリケーションコードは変更しない）
- **承認テストのデータ戦略**（TEST-04）: 各テストが実行時に MEMBER ロールで「第1会議室（要承認）」への新規予約を申請し、一意な `purpose` 文字列（例：`E2E承認テスト-${Date.now()}`）でその場に生成した PENDING 項目を識別する。日時は固定の遠い未来日（例：2027年以降）かつテストごとに異なるオフセットを用いて、シードデータ（`scripts/seed.sql` の既存予約：2026-06-02/03）や他テストとの重複を避ける
- **サインイン→一覧→予約申請の一本化シナリオ**（TEST-03）: 受入条件「サインイン→リソース一覧閲覧→予約申請のフローが1本のテストシナリオとして実行できる」を満たすため、このテストのみ `storageState` を使わず、テスト本体内で実際にサインインから行う
- **対象リソース**: TEST-03 は即時確定（`requires_approval=false`）のリソース（例：プロジェクターA）を選び、承認フローを介さず完結させる。TEST-04 は要承認（`requires_approval=true`）の「第1会議室」を使う

## 実行ステップ

- [x] **Step 1: Playwright 認証フィクスチャ**
  - `frontend/tests/e2e/global-setup.ts` を新規作成（MEMBER・APPROVER 各ロールでブラウザ経由サインインし `storageState` を保存）
  - `frontend/playwright.config.ts` に `globalSetup: "./tests/e2e/global-setup.ts"` を追加
  - `frontend/.gitignore` に `tests/e2e/.auth/` を追加
  - Story mapping: TEST-01, TEST-02, TEST-03, TEST-04（共通基盤）

- [x] **Step 2: TEST-01 サインイン・サインアウト**
  - `frontend/tests/e2e/auth.spec.ts` を新規作成。`storageState` を使わない新規コンテキストで、サインイン画面からMEMBERの開発用ログインボタンをクリックしてサインインできること、その後 `dev-id-token` cookie を削除して保護ページへアクセスすると `/auth/signin` へリダイレクトされることを検証
  - Story mapping: TEST-01

- [x] **Step 3: TEST-02 リソース一覧・詳細閲覧**
  - `frontend/tests/e2e/resources.spec.ts` を新規作成。MEMBER の `storageState` でリソース一覧（`/resources`）を表示し、1件のリソースカードをクリックして詳細画面（`/resources/{id}`）に遷移し情報が表示されることを確認。別テストとして、認証なしの新規コンテキストで `/resources` に直接アクセスすると `/auth/signin` へリダイレクトされることを確認
  - Story mapping: TEST-02

- [x] **Step 4: TEST-03 予約申請（サインイン→一覧→申請の一本化シナリオ）**
  - `frontend/tests/e2e/reservation-flow.spec.ts` を新規作成。`storageState` を使わず、サインイン→リソース一覧→即時確定リソースへの予約申請フォーム入力・送信→`/reservations` へのリダイレクトと申請内容の表示、を1つのテストケースとして実装
  - Story mapping: TEST-03

- [x] **Step 5: TEST-04 APPROVER承認操作（承認・却下）**
  - `frontend/tests/e2e/approval.spec.ts` を新規作成。2つのテストケース（承認・却下）を実装。各ケースで、MEMBER の `storageState` を使った別コンテキストで要承認リソースへ一意な `purpose` 付きで新規予約を申請し、APPROVER の `storageState` を使った別コンテキストで `/approvals` を開き、その申請行を特定して承認（または却下、却下理由を入力）する
  - Story mapping: TEST-04

- [x] **Step 6: 実行・検証**
  - `pnpm test:e2e` を実行し、既存 `example.spec.ts` を含めた全件 pass を確認する（`--workers=1` 固定・8/8 pass を3回連続で確認済み）
  - 各新規テストについて、対象の検証ポイント（例：サインアウト後のリダイレクト、未登録時の非表示相当の確認観点）を一時的に外しても red にならない「弱いテスト」になっていないか、要所をピンポイントで自己検証する（詳細は Step 7 のサマリに記録）
  - Story mapping: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05

- [x] **Step 7: Frontend 層サマリ**
  - 変更点を `Docs/spec/aidlc-docs/construction/e2e-test-coverage/code/frontend-summary.md` に記録（本ユニットは backend 変更なしのため backend-summary.md は作成しない）

## スコープ外（本プランに含めない）

- `ci-frontend.yml` への E2E 実行ステップ追加（Requirements Analysis の決定によりスコープ外）
- ADMIN ロールのシナリオ
- アプリケーションコード（`frontend/src`・`backend`）の変更

## 本プランが Code Generation の唯一の正とする

本ステップ順序・内容が Part 2（Generation）実行の単一の正とする。逸脱する場合は本ファイルを更新してから実行する。
