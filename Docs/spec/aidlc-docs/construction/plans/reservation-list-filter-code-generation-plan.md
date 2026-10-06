# Code Generation Plan — ユニット: reservation-list-filter（予約一覧のフィルタ拡張）

## Unit Context

- **Stories implemented**: US-01, US-02, US-03, US-04（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（前提課題なし）
- **Database entities owned**: `Reservation`（スキーマ変更なし、既存カラム・既存関連でのクエリ追加のみ）
- **Service boundaries**: backend の `domain`/`application`/`presentation` 層内、frontend の `reservations` 画面・BFF 層内に閉じる

## 技術判断（Functional Design で決定した実装機構）

- **Repository 層**: `ReservationRepository` に、共通 JPQL 条件（`RESOURCE_NAME_MATCH`・`PERIOD_MATCH`）をインターフェース定数として追加し、既存4メソッド（無変更）に加えて新規12メソッドを追加する。全16メソッドの一覧は `business-logic-model.md` を単一の正とする
- **resourceName のエスケープ**: keyword 検索（Issue #23）と同じ ESCAPE 文字 `!` を使う（Java/JPQL 二重エスケープ回避のため `\` は使わない）
- **Service 層**: `ReservationService#list` に `String resourceName`・`LocalDateTime from`・`LocalDateTime to` を追加する。resourceName は trim・空文字→null 正規化とワイルドカードエスケープを行う（`ResourceService` と同じロジックをローカルに実装。クラス間の静的依存は作らない）
- **Controller 層**: `ReservationController#list` に `resourceName`/`from`/`to` を `@RequestParam(required = false)` で追加し、from/to 同時指定チェック（`ResourceController` と同じパターン）を行う
- **フロントエンド**: 新規 `ReservationFilterForm.tsx`。既存のステータスタブ（Link ベース）と共存するため、フォーム送信時に `useSearchParams()` から現在の `status` を読み取り URL に転記する

## 実行ステップ

- [x] **Step 1: 仕様書更新（Spec-first）**
  - `/update-spec` スキルで `docs-next/docs/spec/api-spec.md`（`GET /api/reservations` に `resourceName`・`from`・`to` パラメータ追記）・`docs-next/docs/spec/screen-spec.md`（`/reservations` のフィルタ UI 追記）を更新する
  - Story mapping: 全ストーリー（仕様の前提となるドキュメント更新）

- [x] **Step 2: Repository 層生成**
  - `ReservationRepository` に `RESOURCE_NAME_MATCH`・`PERIOD_MATCH` のインターフェース定数と、新規12メソッド（`business-logic-model.md` の一覧表どおり）を追加する
  - Story mapping: US-01, US-02, US-03

- [x] **Step 3: Business Logic 層生成**
  - `ReservationService#list` のシグネチャに `resourceName`・`from`・`to` を追加
  - resourceName 正規化（trim・空文字→null）・エスケープ処理を追加
  - resourceName有無・period有無・status有無・role の組み合わせで16メソッドに分岐するロジックを実装
  - Story mapping: US-01, US-02, US-03

- [x] **Step 4: Business Logic 層ユニットテスト**
  - `ReservationServiceTest` に `list()` を対象にした新規テストを追加する（既存スタブは無いため破壊的変更の懸念なし）
  - Story mapping: US-01, US-02, US-03

- [x] **Step 5: API 層生成**
  - `ReservationController#list` に `resourceName`/`from`/`to` の `@RequestParam` を追加し、from/to 同時指定チェックを実装する
  - Story mapping: US-01, US-02, US-03

- [x] **Step 6: API 層ユニットテスト**
  - `ReservationControllerTest` に resourceName 専用 seed（大文字小文字非依存・`%` エスケープ）・period 専用 seed（重複・範囲外）を追加し、結合テストを追加する
  - 過去ユニット（resource-search/resource-sort）の CI レビューで指摘された「対象コードを無効化しても pass してしまう弱いテスト」パターンを避けるため、各テストについて対象コードを一時的に無効化してテストが red になることを実装時に自己検証する
  - 自己検証結果: `RESOURCE_NAME_MATCH` の `LOWER` 除去・`%` エスケープ除去、`PERIOD_MATCH` の境界条件変更（`<=`/`>=`）・条件片側除去、`isAdmin`/`hasStatusFilter` の強制固定、Controller の from/to 同時指定チェック削除のそれぞれについて、意図した新規テスト（および一部既存テスト）のみが red になることを確認し、復元後に `git diff --stat` が元の差分と一致することを確認した
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 7: Backend 層サマリ**
  - backend 側の変更点を `Docs/spec/aidlc-docs/construction/reservation-list-filter/code/backend-summary.md` に記録

- [x] **Step 8: Frontend Components 生成**
  - `frontend/src/server/actions/reservations.ts`: `ListReservationsParams`/`listReservationsAction` に `resourceName`/`from`/`to` 追加
  - `frontend/src/app/(authenticated)/reservations/ReservationFilterForm.tsx`: 新規作成
  - `frontend/src/app/(authenticated)/reservations/page.tsx`: `searchParams` 読み取り・`ReservationFilterForm` 呼び出し追加
  - `data-testid`: `reservation-filter-form-resource-name-input`・`reservation-filter-form-from-input`・`reservation-filter-form-to-input`
  - Story mapping: US-01, US-02, US-03, US-04

- [x] **Step 9: Frontend Components ユニットテスト**
  - `frontend/tests/unit/server/actions/reservations.test.ts` にパラメータ中継のテストケースを追加
  - 新規 `frontend/tests/unit/reservation-filter-form.test.tsx` を作成（React Testing Library、実際の送信URLを検証する形式でkeyword/sortユニットのCIレビュー指摘を踏まえて最初から実装する）
  - 自己検証結果: `listReservationsAction` の `resourceName` 転送除去・`toIsoWithSeconds` 変換除去、`ReservationFilterForm` の `handleSubmit`/`handleReset` における status 転記除去、`resourceName` の `trim()` 除去のそれぞれについて、意図した新規テストのみが red になることを確認し、復元後にテスト全件green・`pnpm format:check` もgreenであることを確認した
  - Story mapping: US-01

- [x] **Step 10: Frontend 層サマリ**
  - frontend 側の変更点を `Docs/spec/aidlc-docs/construction/reservation-list-filter/code/frontend-summary.md` に記録

## スコープ外（本プランに含めない）

- データベースマイグレーション（スキーマ変更不要のため対象外）
- E2E テスト（既存方針を踏襲しスコープ外）

## 本プランが Code Generation の唯一の正とする

本ステップ順序・内容が Part 2（Generation）実行の単一の正とする。逸脱する場合は本ファイルを更新してから実行する。
