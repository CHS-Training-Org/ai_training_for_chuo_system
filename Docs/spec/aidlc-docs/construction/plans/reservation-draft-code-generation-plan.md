---
title: Code Generation Plan — reservation-draft
description: Construction フェーズ Code Generation の実行計画（バックエンド → フロントエンド → テスト）
---

# Code Generation Plan — reservation-draft

> この計画書が Code Generation の唯一の真実の源。承認後は記載の順序どおりに実行し、完了ごとにチェックボックスを更新する。

## Unit Context

- **対象ユニット**: `reservation-draft`（単一ユニット、縦切り）
- **対象シート**: `docs-next/docs/spec/enhancements/intermediate/reservation-draft.md`
- **前提**: Spec-first 更新（`requirements.md` UC-09 / DRF-01〜07、`api-spec.md`、`screen-spec.md`、`er-diagram.md`、エンハンスシート）は完了済み
- **依存関係**: `ApprovalService.createInitialStep()`（呼び出しのみ・変更なし）、`ResourceService.overlaps()`（再利用）
- **所有する DB エンティティ**: `reservations`（既存。`status` の CHECK に `DRAFT` 定義済みのため **Flyway 追加なし**）
- **サービス境界**: 既存 `ReservationService` / `ReservationController` の範囲内（新規コンポーネントなし）
- **スコープ外**: 承認一覧（`approval_steps` 経由のため下書きは自然に出ない。変更不要）、ダッシュボード、`ErrorCode` の追加（既存の `VALIDATION_ERROR` / `FORBIDDEN` / `NOT_FOUND` / `RESERVATION_CONFLICT` / `APPROVER_NOT_AVAILABLE` で足りる）

### 受入条件とステップの対応（トレーサビリティ）

| 受入条件（シート） | 要件 ID | 実装ステップ | テストステップ |
|---|---|---|---|
| 「下書き保存」で `DRAFT` 保存 | DRF-01 / RSV-04 | 3, 4, 7, 10, 12 | 6, 14 |
| 一覧の `DRAFT` フィルタで表示 | RSV-05 | 13 | 14 |
| 詳細から再編集・正式申請（`PENDING` / `APPROVED`） | DRF-03 / RSV-03 | 3, 4, 8, 11, 12, 13 | 6, 14 |
| 承認一覧に出ない | DRF-02 | （既存挙動） | 6 |
| 本人と ADMIN 以外は 403（APPROVER も） | DRF-05 | 4 | 6 |
| 削除は本人のみ、`DRAFT` 以外は 422 | DRF-04 / RSV-06 | 4, 5, 9, 11, 12 | 6, 14 |
| 正式申請の重複は 409 で `DRAFT` 維持 | DRF-06 | 4 | 6 |
| `DRAFT`→`PENDING` / `APPROVED` の遷移テスト | — | 4 | 6 |
| `cancel` は `DRAFT` に 422 | DRF-07 | （既存ガードで成立） | 6 |

---

## Part A: バックエンド

### Step 1: ドメイン — `Reservation` に正式申請の遷移を追加

- [x] `backend/src/main/java/com/example/bookflow/domain/Reservation.java`
  - `submit(ReservationStatus newStatus)` を追加。`status == DRAFT` でなければ `IllegalStateException`（不正遷移の最終防御。通常は Service のガードが先に弾く）。`newStatus` は `PENDING` / `APPROVED` のみ許可。`updatedAt` を更新
  - クラス Javadoc の「PENDING 状態のみ許可」の記述を `PENDING` / `DRAFT` に直す（`update()` の Javadoc も同様）

### Step 2: DTO — リクエストに `draft` / `submit` を追加

- [x] `presentation/dto/CreateReservationRequest.java`: 末尾に `Boolean draft`（制約なし。`null` は `false` 扱い）。Javadoc に `draft` の説明を追記
- [x] `presentation/dto/UpdateReservationRequest.java`: 末尾に `Boolean submit`（同上）。Javadoc の「更新可能ステータスは PENDING のみ」を修正

### Step 3: Service — 下書き作成（`create`）

- [x] `application/ReservationService.java` の `create()`
  - `Boolean.TRUE.equals(req.draft())` のとき: リソース存在確認（悲観ロック不要だが取得は行う）→ 日時整合性チェック → **重複チェックを行わず** `status = DRAFT` で保存 → **承認ステップを生成せず** 返却（DRF-01 / DRF-02）
  - `draft` が `false`/`null` のときの既存挙動（重複チェック → `APPROVED`/`PENDING` → 承認ステップ）は変更しない（回帰防止）

### Step 4: Service — 更新・正式申請・削除・閲覧権限

- [x] `application/ReservationService.java`
  - `update()`: ステータスガードを `PENDING` / `DRAFT` に拡張（それ以外は 422）。所有権は本人のみ（ADMIN も 403）を維持
    - `DRAFT` かつ `submit` が真でない: 日時整合性チェックのみで内容更新（重複チェックなし。`DRAFT` のまま）
    - `DRAFT` かつ `submit=true`: 悲観ロック取得 → 重複チェック（自己除外、409）→ `requires_approval` で `PENDING` / `APPROVED` を決定 → `reservation.submit()` → `PENDING` のとき `approvalService.createInitialStep()`（承認者不在は 422 `APPROVER_NOT_AVAILABLE`。同一トランザクションのためロールバックされ `DRAFT` のまま残る = DRF-06）
    - `PENDING`: 既存挙動のまま。`submit` は無視する
  - `delete(UUID id, User currentUser)` を新設: 存在確認（404）→ 本人のみ（それ以外は ADMIN も 403）→ `DRAFT` 以外は 422 `VALIDATION_ERROR` → 物理削除
  - `checkReadAccess()`: `DRAFT` は本人と ADMIN のみ。APPROVER・他 MEMBER は 403（DRF-05）
  - `cancel()`: 変更なし（`CANCELLABLE_STATUSES` に `DRAFT` を含まないため 422 が返る = DRF-07）。メッセージ・Javadoc のみ必要なら調整
  - クラス Javadoc の業務ルール一覧（ステータスガード・閲覧権限）を更新

### Step 5: Controller — `DELETE` を追加

- [x] `presentation/ReservationController.java`
  - `@DeleteMapping("/{id}")` `@ResponseStatus(HttpStatus.NO_CONTENT)` の `delete()` を追加（戻り値 `void`）
  - クラス Javadoc のエンドポイント一覧を更新（`PUT` は `PENDING` / `DRAFT`、`DELETE` 追加）

### Step 6: バックエンドのテスト

- [x] `backend/src/test/java/com/example/bookflow/application/ReservationServiceTest.java`（既存 `@Nested` 構造に追加）
  - `Create`: 下書き作成が `DRAFT` を返す／重複があっても 409 にならない／`createInitialStep` が呼ばれない
  - `Get`: `DRAFT` を本人・ADMIN は取得可、APPROVER・他 MEMBER は `AccessDeniedException`
  - `Update`: `DRAFT` 更新のみ（`DRAFT` 維持・重複チェックなし）／**`DRAFT`→`PENDING`（`requires_approval=true`、承認ステップ生成）**／**`DRAFT`→`APPROVED`（`requires_approval=false`、承認ステップなし）**／正式申請の重複で `ReservationConflictException` かつ状態が `DRAFT` のまま／承認者不在で `BusinessException(APPROVER_NOT_AVAILABLE)`／ADMIN による `DRAFT` 更新は 403／`PENDING` に `submit=true` を指定しても無視される
  - 新規 `Delete`: 本人は削除可／ADMIN・他人は 403／`PENDING` 等は 422／存在しない ID は 404
  - `Cancel`: `DRAFT` のキャンセルが 422
- [x] `backend/src/test/java/com/example/bookflow/presentation/ReservationControllerTest.java`
  - `POST` に `draft: true` → 201 かつ `status = DRAFT`
  - `PUT` の `submit: true` → 200（遷移）、重複 → 409
  - `DELETE` → 204／`DRAFT` 以外 → 422／他人 → 403／`GET` の `DRAFT` を APPROVER が取得 → 403
- [x] 既存の予約・承認テストが引き続き pass することを確認する対象に含める（Build and Test で実行）

---

## Part B: フロントエンド

### Step 7: Zod スキーマ

- [x] `frontend/src/lib/schemas/reservation.ts`
  - `CreateReservationSchema` に `draft: z.boolean().optional()`、`UpdateReservationSchema` に `submit: z.boolean().optional()` を追加（必須項目の検証は変更しない = 下書きも通常申請と同一検証）

### Step 8: API クライアントと Server Actions

- [x] `frontend/src/lib/api-client.ts`: 204 を返す `DELETE` 用の `deleteEmpty(path)` を追加し、戻りオブジェクトに公開（`postEmpty` と同様の方針）
- [x] `frontend/src/server/actions/reservations.ts`
  - `createReservationAction` の Javadoc を更新（`draft` を透過で送る）
  - `submitReservationAction(id, input)` を追加（`PUT` に `submit: true` を付与）
  - `deleteReservationAction(id)` を追加（`DELETE`）
  - `updateReservationAction` の Javadoc を `PENDING` / `DRAFT` に更新

### Step 9: ラベル・共通表示

- [x] `frontend/src/lib/labels.ts`: `DRAFT: "ドラフト"` → `"下書き"`（`screen-spec.md` の「下書き（DRAFT）」に合わせる）
- [x] バッジ色: 一覧・詳細ページの `statusBadgeClass` の `DRAFT` を青系（`bg-blue-100 text-blue-700`）に変更（`screen-spec.md`: `DRAFT`=青）

### Step 10: 申請フォームに「下書き保存」

- [x] `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx`
  - 「下書き保存」ボタン（`type="button"`、`variant="secondary"`、`data-testid="reservation-form-draft-button"`）を追加。クリックで同じ `FormSchema` の検証を通してから `draft: true` で `createReservationAction` を呼ぶ（`form.handleSubmit` を再利用）
  - 既存ボタンにも `data-testid`（`reservation-form-submit-button`）を付与
  - 成功後は `/reservations` へ遷移。進行中表示（「保存中...」）と二重送信防止

### Step 11: 詳細ページの操作（編集・正式申請・削除）

- [x] `frontend/src/app/(authenticated)/reservations/[id]/page.tsx`
  - `canEdit`: `PENDING` または `DRAFT`、かつ本人（ADMIN 不可）
  - `DRAFT` かつ本人: 「正式申請」「削除」を表示。`DRAFT` にはキャンセルボタンを出さない（`CANCELLABLE_STATUSES` は変更しない）
  - 他人の `DRAFT` を ADMIN が開いた場合は閲覧のみ（操作ボタンなし）
- [x] `frontend/src/app/(authenticated)/reservations/[id]/SubmitDraftButton.tsx`（新規）: `submitReservationAction` 呼び出し。成功で `router.refresh()`。`RESERVATION_CONFLICT` は「指定した時間帯は既に予約が入っています」を表示し `DRAFT` のまま。承認者不在（`APPROVER_NOT_AVAILABLE`）も画面に表示
  - 正式申請には保存済みの内容を使うため、PUT のボディは詳細ページが持つ予約の値（`startAt` / `endAt` / `purpose` / `attendeesCount`）を渡す
- [x] `frontend/src/app/(authenticated)/reservations/[id]/DeleteDraftButton.tsx`（新規）: `CancelButton` と同じ Dialog 方式の確認 → `deleteReservationAction` → `/reservations` へ遷移

### Step 12: 編集ページの `DRAFT` 許可

- [x] `frontend/src/app/(authenticated)/reservations/[id]/edit/page.tsx`: `notFound()` 条件を `PENDING` / `DRAFT` 以外に変更。`DRAFT` のときの説明文を切り替え
- [x] `frontend/src/app/(authenticated)/reservations/[id]/edit/ReservationEditForm.tsx`: コメントの対象ステータス記述を更新（`DRAFT` は `DRAFT` のまま更新。送信は `updateReservationAction` で変更なし）

### Step 13: 一覧の「下書き」タブ

- [x] `frontend/src/app/(authenticated)/reservations/page.tsx`: `ALL_STATUSES` に `DRAFT` を追加（並びは `screen-spec.md` に合わせ「すべて」→「下書き」→「承認待ち」…）。「すべて」は status 指定なし＝下書きも含まれる

### Step 14: フロントエンドのテスト（Vitest + MSW）

- [x] `frontend/tests/unit/msw/handlers.ts`: `POST /reservations` が `draft` を反映した `status` を返す、`PUT` が `submit` を反映する、`DELETE /reservations/:id`（204）を追加。**共通ハンドラの既存応答は変えない**
- [x] `frontend/tests/unit/server/actions/reservations.test.ts`: `server.use` で送信ボディを捕捉し、`draft: true` / `submit: true` の送信内容、`deleteReservationAction` の 204、403 / 409 / 422 時の `ApiClientError` を検証
- [x] `frontend/tests/unit/lib/reservation-schema.test.ts`（新規）: `draft` / `submit` の許容と必須項目の検証が変わらないこと
- [x] `frontend/tests/unit/app/reservation-form.test.tsx`（新規）: 「下書き保存」で `draft: true` が送られる／必須項目未入力では送信されない／「予約を申請する」では `draft` が付かない
- [x] `frontend/tests/unit/app/reservation-detail-page.test.tsx`（新規）: `DRAFT`×本人 → 編集・正式申請・削除が出てキャンセルは出ない／`PENDING`×本人 → 従来どおり（編集・キャンセル）／ADMIN×他人の `DRAFT` → 操作なし
- [x] 実装を一時的に壊す変異検証（`draft` 付与の撤去、表示分岐の撤去など）で対応テストが失敗することを確認し、元に戻す（前回ワークフローの運用を踏襲）

---

## Part C: ドキュメント・仕上げ

### Step 15: ドキュメントとコード要約

- [x] `docs-next/docs/spec/` は更新済みのため、実装中に仕様との差異（項目名・メッセージ等）が出た場合のみ `/update-spec` で修正する（差異がなければ変更しない）
- [x] `Docs/spec/aidlc-docs/construction/reservation-draft/code/code-summary.md`: 変更・新規ファイル一覧（modified / created の区別）と設計上の判断（遷移ガードの置き場所 = Service がガード、ドメインは最終防御）を記録
- [x] 重複ファイル（`*_modified.*` 等）が作られていないことを確認する

### Step 16: ビルド・テストの実行は Build and Test ステージで行う

- この Code Generation ステージでは、コードとテストの**生成まで**を行う（実行・検証は次の Build and Test ステージ。`construction/build-and-test.md` に従う）。ただし生成中の明らかな構文エラーを避けるための最小限のコンパイル確認（`./gradlew compileJava compileTestJava` / `pnpm exec tsc --noEmit`）は行ってよい

---

## 規模

- **全 16 ステップ**（バックエンド 6 / フロントエンド 8 / 仕上げ 2）
- 変更 17 ファイル前後（新規 4: `SubmitDraftButton.tsx` / `DeleteDraftButton.tsx` / テスト 2〜3 本）
- Flyway・依存ライブラリの追加なし

## リスクと対応

| リスク | 対応 |
|---|---|
| `POST` / `PUT` の既存挙動の回帰 | 既存分岐は変更せず `draft` / `submit` の分岐を足すだけにし、既存テストを残したまま `PENDING` / `APPROVED` 系の回帰ケースを維持 |
| 正式申請で `createInitialStep` が失敗したときに `APPROVED` / `PENDING` が残る | `@Transactional` のロールバックに依存。Service テストでは状態が `DRAFT` のままであることを明示的に検証 |
| 競合課題 2 件と同じ API・画面を触る | 影響範囲を `ReservationService` / 予約画面に限定し、マージ時の衝突はコミット粒度を小さくして吸収 |
| ADMIN の全予約一覧に他人の `DRAFT` が混ざる | `api-spec.md` / `screen-spec.md` で確定済みの仕様どおり（一覧は含む。詳細は閲覧のみ） |
