# Code Generation Plan — ユニット: reservation-draft（予約の下書き保存）

## Unit Context

- **Stories implemented**: US-01〜US-06（`Docs/spec/aidlc-docs/inception/user-stories/stories.md`）
- **Dependencies**: なし（前提課題なし、`DRAFT`は既存スキーマのCHECK制約に定義済み）
- **Database entities owned**: なし（スキーマ変更なし）
- **Service boundaries**: backend は `ReservationController`・`ReservationService`・`Reservation`エンティティ・関連DTO、frontend は `reservations/` 配下の各画面に閉じる。`ApprovalService`・`ResourceService`は呼び出し元としての関係のみで、内部実装は変更しない

## 技術判断の参照先

Functional Design（`Docs/spec/aidlc-docs/construction/reservation-draft/functional-design/`）で確定済みのロジック・業務ルールをそのまま実装する。本プランでは再掲せず参照にとどめる：

- `business-logic-model.md`：作成時・更新時のステータス決定ロジック、approval_steps統一作成条件、アクセス制御拡張、キャンセル転用
- `business-rules.md`：BR-01〜10
- `domain-entities.md`：DTOフィールド追加の具体的な型定義
- `frontend-components.md`：画面ごとの変更点

## 実行ステップ

- [x] **Step 1: 仕様書更新**
  - `docs-next/docs/spec/api-spec.md` §`POST /api/reservations`：`draft`フィールドとDRAFT作成を追記。§`PUT /api/reservations/{id}`：`submit`フィールドとDRAFT→PENDING/APPROVED遷移を追記
  - `docs-next/docs/spec/screen-spec.md` §`/reservations/new`：「下書き保存」ボタンを追記。§`/reservations`：「下書き」タブを追記。§`/reservations/{id}`：DRAFT時の編集・正式申請導線を追記
  - `docs-next/docs/spec/requirements.md`：「DRAFTはベース実装では未使用」という記述（L142, L226）を更新し、本ユニットでの状態遷移ルールを追記
  - `docs-next/docs/spec/er-diagram.md`：同様の記述更新
  - frontmatterの`last_updated`を更新
  - Story mapping: US-01, US-02, US-03, US-05

- [x] **Step 2: Backend DTO変更**
  - `CreateReservationRequest.java`に`draft`（`Boolean`、任意）を追加
  - `UpdateReservationRequest.java`に`submit`（`Boolean`、任意）を追加
  - Story mapping: US-01, US-03

- [x] **Step 3: Backend ドメイン・サービス層の実装**
  - `Reservation.java`：DRAFT→PENDING/APPROVED遷移用の新規メソッドを追加（`business-logic-model.md`ロジック2参照）
  - `ReservationService.create`：`draft`に応じたステータス決定・approval_steps作成条件の分岐（ロジック1）
  - `ReservationService.update`：ステータスガードの拡張（PENDING または DRAFT を許可）、`submit`による正式申請分岐（ロジック2）
  - `ReservationService.checkReadAccess`：DRAFT時のAPPROVER除外（ロジック4）
  - `ReservationService.CANCELLABLE_STATUSES`定数に`DRAFT`を追加（ロジック5）
  - Story mapping: US-01, US-02, US-03, US-04, US-06

- [x] **Step 4: Backend ユニットテスト（ReservationServiceTest）**
  - DRAFT作成（承認ステップ非生成を含む）、DRAFT内容更新（ステータス不変）、DRAFT→PENDING正式申請（要承認リソース、approval_steps作成）、DRAFT→APPROVED正式申請（承認不要リソース）、DRAFT以外のステータスでの`submit`無視、DRAFT詳細アクセス制御（本人・ADMIN許可、APPROVER拒否）、DRAFTキャンセル成功のテストケースを追加
  - 既存テスト（`update_approvedReservation_throwsBusinessException`等）が壊れていないことを確認
  - Story mapping: US-01, US-02, US-03, US-04, US-06

- [x] **Step 5: Backend 結合テスト（ReservationControllerTest）・Controller整合**
  - `ReservationController.java`のJavadoc（create/get/update）をDRAFT対応に合わせて更新
  - `ReservationControllerTest`に、Step 4相当のシナリオをHTTPレベルで追加（201/200/403/422のステータスコード検証を含む）
  - Story mapping: US-01, US-03, US-06

- [x] **Step 6: Backend層サマリ**
  - 変更点を`Docs/spec/aidlc-docs/construction/reservation-draft/code/backend-summary.md`に記録
  - `./gradlew spotlessApply checkstyleMain test`で全テスト成功を確認

- [x] **Step 7: Frontend スキーマ・Server Action**
  - `frontend/src/lib/schemas/reservation.ts`：`CreateReservationSchema`に`draft`、`UpdateReservationSchema`に`submit`を追加
  - `frontend/src/server/actions/reservations.ts`：型定義の反映を確認（関数本体の変更要否を確認）
  - Story mapping: US-01, US-03

- [x] **Step 8: Frontend 予約申請フォーム・予約一覧**
  - `ReservationForm.tsx`：「下書き保存」ボタンを追加
  - `reservations/page.tsx`：ステータス未指定時のデフォルトフィルタ（DRAFT以外の4値）適用、「下書き」タブ追加
  - Story mapping: US-01, US-05

- [x] **Step 9: Frontend 予約詳細・編集画面**
  - `reservations/[id]/page.tsx`：`CANCELLABLE_STATUSES`に`DRAFT`追加、`canEdit`拡張、正式申請導線の追加
  - `reservations/[id]/edit/page.tsx`：アクセス制御の拡張（DRAFT許可）
  - `ReservationEditForm.tsx`：「正式申請」ボタン追加（`submit=true`で送信）
  - Story mapping: US-02, US-03, US-04

- [x] **Step 10: Frontend ユニットテスト**
  - `ReservationForm.tsx`：下書き保存ボタンのテスト追加
  - `server/actions/reservations.test.ts`：`draft`/`submit`パラメータ中継のテスト追加
  - 予約一覧・詳細・編集画面の関連テスト追加（新規ファイルまたは既存ファイルへの追加はCode Generation実行時に判断）
  - 自動化しやすいUIにするため、新規追加するボタン等に`data-testid`を付与する
  - Story mapping: US-01, US-02, US-03, US-04, US-05, US-06

- [x] **Step 11: Frontend層サマリ**
  - 変更点を`Docs/spec/aidlc-docs/construction/reservation-draft/code/frontend-summary.md`に記録
  - `pnpm lint && pnpm format:check && pnpm test && pnpm build`ですべて成功することを確認

## スコープ外（本プランに含めない）

- 新規の物理削除（DELETE）APIの追加
- DRAFT作成時のバリデーション緩和
- 複数段階承認フロー等、承認フロー自体の変更
- E2Eテストへの下書きシナリオ追加（既存のE2Eスイート（`pnpm test:e2e`）は回帰確認のみ実施し、新規シナリオの追加は本ユニットのスコープ外とする）

## 本プランが Code Generation の唯一の正とする

本ステップ順序・内容が Part 2（Generation）実行の単一の正とする。逸脱する場合は本ファイルを更新してから実行する。
