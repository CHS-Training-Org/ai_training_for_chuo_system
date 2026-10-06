# Code Structure（スコープ追加）— e2e-test-coverage

既存の `code-structure.md` 等は Resource ドメインにスコープしているため転用できない。本ユニット（Issue #26、E2Eテスト追加）に必要な認証・各画面フローを追加調査する。

## Playwright 基盤

- `frontend/playwright.config.ts`: `testDir: ./tests/e2e`、`fullyParallel: true`、`webServer` が `pnpm dev` を自動起動（`reuseExistingServer: !process.env.CI`）。CI ではなくローカル実行が前提の構成（`CI` 環境変数未設定時はサーバー起動済みを再利用）
- `frontend/tests/e2e/example.spec.ts`: 唯一の既存テスト（トップページの見出し表示のみ）。`storageState`・`global-setup` は未導入
- `.github/workflows/ci-frontend.yml`: `pnpm test:e2e` の実行ステップは**存在しない**。バックエンド・PostgreSQL・cognito-local を起動する手順も無い（純粋なフロントエンドの lint/test/build のみ）。CI に E2E を組み込む場合、スタック起動の追加設定が別途必要になる

## 認証フロー（重要な発見）

- `frontend/src/app/auth/signin/page.tsx`: `NODE_ENV !== 'production'` の場合、本番サインインボタンに加えて「一般社員（MEMBER）でログイン」「承認者（APPROVER）でログイン」「管理者（ADMIN）でログイン」の3ボタンを表示する（`frontend/src/server/actions/dev-auth.ts` の `devLoginAction` をフォーム送信）
- `devLoginAction`: `scripts/provision-cognito.sh` が作成するシードユーザー（`hanako.tanaka@example.com`=MEMBER 等）で cognito-local に対し直接 `InitiateAuth` し、取得した IdToken を `dev-id-token` という**専用 cookie**に保存する（Better Auth のセッションとは別経路）
- `frontend/src/lib/session.ts` の `getSession()`/`getAccessToken()`: `dev-id-token` cookie が存在する場合は**無条件にそれを優先**する
- **既知のギャップ**：`frontend/src/server/actions/auth.ts` の `signOutAction`（Header の「サインアウト」ボタンから呼ばれる）は Better Auth の `auth.api.signOut` のみを呼び出し、`dev-id-token` cookie を削除しない。そのため開発用ロールログインでサインインした状態で UI の「サインアウト」ボタンを押しても、`getSession()` は `dev-id-token` を見続けるため**サインアウトが成立しない**（`(authenticated)/layout.tsx` の `redirect("/auth/signin")` が発火しない）。本課題は「機能仕様に変更なし」（テスト追加のみ）のため、アプリケーションコード側でこのギャップを修正することはスコープ外と考えられるが、E2E テスト側でどう回避するかの判断が必要
- `frontend/src/app/(authenticated)/layout.tsx`: `getSession()` が falsy の場合 `/auth/signin` へリダイレクト（未サインイン時のリダイレクト確認に使える）

## 各シナリオに関連する画面・コンポーネント

- **TEST-02（リソース一覧・詳細）**: `frontend/src/app/(authenticated)/resources/page.tsx`・`resources/[id]/page.tsx`
- **TEST-03（予約申請）**: `frontend/src/app/(authenticated)/reservations/new/page.tsx` + `ReservationForm.tsx`。`resourceId`（セレクト）・`startAt`/`endAt`（datetime-local）・`purpose`（必須）・`attendeesCount`（任意）。送信成功で `/reservations` へ `router.push`。重複時は 409 をインライン表示
- **TEST-04（承認操作）**: `frontend/src/app/(authenticated)/approvals/page.tsx` + `ApprovalTable.tsx`。承認待ちの `ApprovalStepResponse[]` をテーブル表示。各行に「承認」（コメント任意）・「却下」（コメント必須、却下理由未入力だとクライアント側バリデーションでブロック）ダイアログ

## テストデータ（シード）

- `scripts/seed.sql`: 「第1会議室」（`requires_approval=true`）に対する **PENDING 予約＋対応する approval_steps が1件、最初から投入済み**（MEMBER 申請）。APPROVER（`ichiro.suzuki@example.com`）でサインインすればこの承認待ち項目がそのまま操作対象になる
- **重要な懸念**：このシード PENDING 項目は固定の1件のみ。E2E テストで承認または却下すると状態が変わり、DB が再シードされない限り**再実行では同じ項目は使えない**（`playwright.config.ts` の `webServer.reuseExistingServer: !process.env.CI` はアプリサーバーの話であり、DB の再作成とは無関係）。再実行可能性をどう担保するかは設計判断が必要（シードに依存する／テスト自身で都度 PENDING 項目を作る）
