# Code Generation Summary — `reservation-draft`

**ユニット**: `reservation-draft`
**作成日時**: 2026-10-02T11:02:40+00:00
**計画**: [`reservation-draft-code-generation-plan.md`](../../plans/reservation-draft-code-generation-plan.md)（全16ステップ・すべて完了）

---

## 1. 変更したファイル

### バックエンド（6ファイル・いずれも既存の変更）

| ファイル | 内容 |
|---|---|
| `presentation/dto/CreateReservationRequest.java` | `draft` フィールドと `isDraft()` を追加 |
| `presentation/dto/UpdateReservationRequest.java` | `status` フィールドを追加（`ReservationStatus` 型） |
| `domain/Reservation.java` | `markPending()` を追加 |
| `application/ReservationService.java` | `create` の下書き分岐、`update` のステータスガード拡張と正式申請、`checkReadAccess` の `DRAFT` 分岐、`initialStatusFor` と `guardSubmitTransition` を追加 |
| `test/application/ReservationServiceTest.java` | `Draft` ネストクラス15件を追加。既存の DTO 生成10箇所に引数を追加 |
| `test/presentation/ReservationControllerTest.java` | 下書きの seed データ2件とテスト10件を追加 |

### フロントエンド（9ファイル・うち新規3件）

| ファイル | 内容 |
|---|---|
| `src/lib/reservation-permissions.ts` | **新規**。`canEditReservation` と `canSubmitDraft` |
| `src/app/(authenticated)/reservations/[id]/SubmitDraftButton.tsx` | **新規**。確認ダイアログ付きの正式申請ボタン |
| `tests/unit/reservation-permissions.test.ts` | **新規**。権限判定の単体テスト |
| `src/server/actions/reservations.ts` | `createReservationAction` に `draft`、`updateReservationAction` に `status` の引数を追加 |
| `src/app/(authenticated)/reservations/new/ReservationForm.tsx` | 下書き保存ボタンを追加 |
| `src/app/(authenticated)/reservations/page.tsx` | `ALL_STATUSES` に `DRAFT` を追加 |
| `src/app/(authenticated)/reservations/[id]/page.tsx` | 編集・正式申請ボタンの表示判定を純関数に置き換え、`SubmitDraftButton` を組み込み |
| `src/app/(authenticated)/reservations/[id]/edit/page.tsx` | `DRAFT` を編集対象に含め、説明文とコメントを更新 |
| `tests/unit/server/actions/reservations.test.ts` | `draft` と `status` の送信有無のテスト4件を追加 |

### 変更しなかったファイル

計画どおり `ReservationController.java`、`ReservationEditForm.tsx`、`lib/schemas/reservation.ts` は変更していない。

---

## 2. 実装中に判明した点

### 既存テストの DTO 生成を更新した

`CreateReservationRequest` と `UpdateReservationRequest` は record のため、フィールドを足すとコンストラクタの引数が増える。
`ReservationServiceTest` の10箇所が影響を受けた。
互換のための補助コンストラクタは足さず、呼び出し側に `null` を渡す形に更新した。
DTO は Jackson がデシリアライズする型であり、テストの都合で生成経路を増やすと実際のリクエストと乖離するため。

### 申請フォームの型エラー

`form.handleSubmit(handler)` の `handler` は react-hook-form が第2引数にイベントを渡す。
当初ここに `draft` を第2引数として足したため、`SubmitHandler` の型と衝突してビルドが失敗した。
送信処理を `submitForm(values, draft)` という別の関数に閉じ込め、`handleSubmit` には引数1つのクロージャを渡す形に変更した。

### 正式申請が 409 になったときの行き止まりを塞いだ

当初の `SubmitDraftButton` は、409 を捕捉してダイアログ内にメッセージを出すだけだった。
しかし props で受け取った日時は `router.refresh()` まで変わらないため、
利用者が同じダイアログで再度「申請する」を押しても必ず同じ 409 になり、そこから進む手がなくなる。
409 のときは「申請する」を「日時を変更する」に差し替え、予約編集画面へ遷移できるようにした。

### 設計書の記述を実装に合わせた

正式申請での内容更新と重複チェックの順序について、設計書は「内容を更新してから重複チェック」と書いていたが、
実装は既存の `update` に合わせて「ロック取得、重複チェック、内容の更新」の順とした。
重複チェックは保存済みの値ではなくリクエストの日時を対象にするため、どちらの順序でも結果は変わらない。
[業務ロジック設計](../functional-design/business-logic-model.md)の該当箇所を実装に合わせて修正した。

---

## 3. 検証結果（この時点）

| 項目 | 結果 |
|---|---|
| backend ユニット・結合テスト | 181件すべて通過 |
| frontend ユニットテスト | 108件すべて通過（12ファイル） |
| `pnpm lint`（oxlint） | 通過 |
| `pnpm format:check`（oxfmt） | 通過 |
| `pnpm build`（Next.js・型検査込み） | 成功 |

CI Frontend が実行するのは `pnpm lint` / `pnpm format:check` / `pnpm build` / `pnpm test` の4つで、
`tsc --noEmit` の独立したステップはない。`tests/` 配下は `pnpm build` の型検査の対象外である。

網羅的なビルドとテストの実行は Build and Test ステージで行う。

---

## 4. 受入基準との対応

### バックエンドで検証した分

| 受入基準 | テスト |
|---|---|
| AC-01-2 | `create_draftWithRequiresApprovalFalse_returnsDraft` / `create_draftWithRequiresApprovalTrue_returnsDraft` / `create_draftFlag_returns201Draft` |
| AC-01-3 | 既存の `create_noConflictRequiresApprovalFalse_returnsApproved` ほか（非回帰） |
| AC-01-4 | `create_draftWithOverlappingReservation_returnsDraftWithoutConflict` |
| AC-03-2 | `update_draftWithoutStatus_staysDraft` / `update_draftContentByOwner_staysDraft` |
| AC-03-5 | 既存の `update_approvedReservation_returns422`（非回帰） |
| AC-04-2 | `update_submitDraftWithRequiresApprovalTrue_returnsPendingAndCreatesApprovalStep` / `update_submitDraftWithApprovalRequired_returns200Pending` |
| AC-04-3 | `update_submitDraftWithRequiresApprovalFalse_returnsApprovedWithoutApprovalStep` |
| AC-04-4 | `update_submitDraftWithConflict_throwsAndKeepsDraft` |
| AC-04-5 | `update_submitNonDraftReservation_throwsBusinessException` / `update_submitNonDraftReservation_returns422` |
| AC-04-6 | `update_submitWithStatusOtherThanPending_throwsBusinessException` / `update_submitWithStatusOtherThanPending_returns422` |
| AC-04-7 | `update_draftWithoutStatus_staysDraft` |
| AC-05-1 | `create_draft_doesNotCreateApprovalStep` / `create_draftFlag_returns201Draft`（`approval_steps` が0件であることを確認） |
| AC-05-2 | 承認ステップを作らないことにより成立（`ApprovalService.listPending` は `approval_steps` のみを参照） |
| AC-06-1 | `get_draftByApprover_throwsAccessDeniedException` / `get_approverAccessOtherDraft_returns403` |
| AC-06-2 | `get_draftByOtherMember_throwsAccessDeniedException` / `get_otherMemberDraft_returns403` |
| AC-06-3 | `get_pendingByApprover_returnsResponse` / `get_approverAccessOtherPending_returns200` |
| AC-07-1 | `get_draftByAdmin_returnsResponse` / `get_adminAccessOtherDraft_returns200` |
| AC-07-3 | `update_otherMemberDraftByAdmin_returns403` |

### フロントエンドで検証した分

| 受入基準 | テスト |
|---|---|
| AC-01-1 | `draft=true: リクエストボディに draft を含め、DRAFT の予約を返す` |
| AC-03-1、AC-04-1、AC-07-4 | `reservation-permissions.test.ts` の全ケース |
| AC-04-7 | `status を省略: リクエストボディに status を含めない` |

### 自動テストで扱わない分

`AC-01-6`（下書き保存後の遷移先）、`AC-02-1` から `AC-02-4`（一覧タブ）、`AC-03-3`（編集画面の表示）、`AC-04-8`（正式申請後の再描画）は
サーバーコンポーネントの描画と画面遷移に関わるため、ユニットテストでは扱わない。
Build and Test ステージで、アプリケーションを起動し Playwright の Chromium で実際に操作して確認する。
`AC-06-1` などの 403 の画面表示は、エラーバウンダリ未設置により既存挙動と同一のため対象外とする（要件定義 §8）。
