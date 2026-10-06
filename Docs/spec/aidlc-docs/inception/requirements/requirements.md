# Requirements — e2e-test-coverage（既存機能の E2E テスト追加）

## Intent Analysis Summary

- **User Request**: GitHub Issue #26「既存機能の E2E テスト追加」。ビジネス要求シート `docs-next/docs/spec/enhancements/beginner/e2e-test-coverage.md` に基づく。
- **Request Type**: Enhancement（テスト追加のみ、機能仕様の変更なし）
- **Scope Estimate**: Multiple Components（認証・リソース一覧/詳細・予約申請・承認操作の4画面フローをまたぐ）
- **Complexity Estimate**: Medium（新規ロジックは無いが、認証状態の共有・テストデータの再実行可能性等、設計判断を要する論点が複数ある。シート記載の推定工数は3〜5時間）

## 背景

BookFlow の Playwright テストは `frontend/tests/e2e/example.spec.ts` の1件のみで、主要なユーザーフロー（サインイン・リソース閲覧・予約申請・承認）はカバーされていない。これらに E2E テストを追加し、機能改修時のリグレッションを検出できるようにする。

## 機能要件

| # | 要件 |
|---|------|
| TEST-01 | MEMBER ロールでのサインイン・サインアウトをシナリオとしてカバーする |
| TEST-02 | リソース一覧の閲覧・詳細確認のシナリオをカバーする（未サインインでのリダイレクト確認を含む） |
| TEST-03 | 予約申請フォームへの入力・送信（正常系）のシナリオをカバーする |
| TEST-04 | APPROVER ロールでの承認操作（承認・却下）のシナリオをカバーする |
| TEST-05 | 追加した E2E テストが `pnpm test:e2e` で全件 pass する |

## 設計判断の決定（確認質問の回答）

### サインアウト検証（TEST-01）

開発用ロールログイン（`devLoginAction`）は専用 cookie（`dev-id-token`）を発行するが、Header の「サインアウト」ボタン（`signOutAction`）は Better Auth のセッションのみを解除し、この cookie を削除しない（RE調査で判明した既存のギャップ）。

- **決定**: E2E テスト側で Playwright の `context.clearCookies()`（または `dev-id-token` の個別削除）により `dev-id-token` を削除し、その後に保護ページ（例：`/resources`）へアクセスして `/auth/signin` へリダイレクトされることを確認する。アプリケーションコード（`auth.ts`/`dev-auth.ts`）は変更しない。
- **理由**: 本課題は「機能仕様に変更なし」（影響範囲節）と明記されており、`signOutAction` の挙動修正は本課題のスコープを超える機能修正にあたる。

### APPROVER 承認操作テストのデータ戦略（TEST-04）

`scripts/seed.sql` には PENDING 予約（承認待ち）が固定で1件投入済みだが、テストで承認/却下すると状態が変わり、DB が再シードされない限り再実行できない。

- **決定**: APPROVER 承認操作テストは、テスト自身が事前に MEMBER ロールでサインインし、「第1会議室」（`requires_approval=true`）への新規予約申請を行って PENDING 項目を作成したうえで、APPROVER に切り替えて承認・却下を行う。固定シード項目には依存しない。
- **理由**: 何度でも再実行可能にするため。TEST-03（予約申請）のフローと内部的に連携するが、テストケース自体は独立して実行できる。

### CI 組み込み（TEST-05 の「CI で自動実行させる場合は」の解釈）

- **決定**: 今回のスコープは「追加した E2E テストがローカルの `pnpm test:e2e` で全件 pass すること」までとし、`ci-frontend.yml` への組み込みは対象外とする。
- **理由**: `ci-frontend.yml` にはバックエンド・PostgreSQL・cognito-local を起動する手順が無く、組み込む場合は小さくない CI インフラ整備が別途必要になる。ビジネス要求シートの推定工数（3〜5時間・対象レイヤー：frontend）と整合しない規模の作業になるため、将来の別課題として切り出すのが妥当。

## 非機能要件

- **再実行可能性**: 各テストは、他のテストの実行順序やシード状態に依存せず、繰り返し実行できること（上記 APPROVER テストデータ戦略に基づく）。
- **認証状態の共有**: サインイン操作（`devLoginAction` のフォーム送信）を各テストで毎回繰り返すとテスト時間が増えるため、Playwright の `storageState` を活用してロールごとの認証済み状態を再利用する（`global setup` でロール別に事前サインインし、`storageState` ファイルを生成）。

## 受入条件（ビジネス要求シートより）

- [ ] `pnpm test:e2e` を実行すると、追加したシナリオがすべて pass する
- [ ] サインイン → リソース一覧閲覧 → 予約申請 のフローが1本のテストシナリオとして実行できる
- [ ] APPROVER ロールでサインインして承認操作を行うシナリオが実行できる
- [ ] 既存の `example.spec.ts` も引き続き pass する
- [ ] テストはフィクスチャ（`playwright.config.ts` の設定や `global-setup` 等）を活用してサインイン状態を共有し、重複を最小化している

## 影響範囲

- **対象レイヤー**: frontend のみ（テストコード追加のみ、アプリケーションコードの変更なし）
- **更新が必要な spec**: なし（ビジネス要求シートに明記のとおり、機能仕様に変更なし）
- **変更対象ファイル**（RE 調査 `code-structure-e2e-test-coverage.md` 参照）: `frontend/tests/e2e/` 配下の新規テストファイル、`frontend/playwright.config.ts`（`storageState`/`globalSetup` 設定追加の可能性）、新規 `frontend/tests/e2e/global-setup.ts`（または同等のフィクスチャ）

## 依存関係・競合課題

- 前提課題：なし
- 競合課題：なし（テスト追加のみで機能仕様を変更しないため、他のエンハンス課題との競合は発生しない）

## スコープ外

- `ci-frontend.yml` への E2E 実行ステップ追加（上記の決定により今回は対象外）
- `signOutAction`/`devLoginAction` のアプリケーションコード修正（機能仕様変更に該当するため対象外）
- ADMIN ロールのシナリオ（ビジネス要求シートの要件に含まれないため対象外）
