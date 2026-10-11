# Frontend Components — reservation-draft

## `.../reservations/new/ReservationForm.tsx`（改修）

- props・stateは変更なし
- `handleSubmit` を2系統に分ける（例：`onSubmitSubmit`/`onSubmitDraft`、または共通ハンドラに `isDraft: boolean` 引数を渡す）。どちらも同じバリデーション（`FormSchema`）を通過させた上で、`createReservationAction({ ...values, draft: true/false })` を呼ぶ
- ボタン行に「下書き保存」ボタンを追加する（`type="button"`、`form.handleSubmit` を直接呼び出すか、hidden submitterで`draft`値を切り替える）。成功時の遷移先は「予約を申請する」と同じ `/reservations` でよい（下書き保存後に一覧の「下書き」タブで確認できるため）

## `.../reservations/page.tsx`（改修）

- `ALL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]` は変更不要（既に`DRAFT`を含まない4値）
- **「すべて」タブの挙動**：現状 `selectedStatuses.length === 0` のとき `listReservationsAction` へステータスフィルタを渡していない（無条件に全件取得、DRAFTも混入する）。これを「`selectedStatuses` が空の場合は `ALL_STATUSES`（4値）をデフォルトとして渡す」よう変更する（`/reservations` への直接アクセス・サイドバーの「マイ予約」リンクを含む、すべての「フィルタ未指定」経路をカバーするため）
- **「すべて」タブのリンク先**：`/reservations`（クエリなし）のままでよい（上記のデフォルト適用により、バックエンドへは4値が渡る）
- **新規「下書き」タブ**：`/reservations?status=DRAFT` へのリンクを追加する。タブのアクティブ判定は `selectedStatuses.length === 1 && selectedStatuses[0] === "DRAFT"`
- `STATUS_VARIANTS`・`statusBadgeClass` は既に `DRAFT` 対応済みのため変更不要

## `.../reservations/[id]/page.tsx`（改修）

- `CANCELLABLE_STATUSES`（現状 `["PENDING", "APPROVED"]` と推定）に `"DRAFT"` を追加する
- `canEdit`（現状 `reservation.status === "PENDING" && isOwner && !isAdmin"`）を `["PENDING", "DRAFT"].includes(reservation.status) && isOwner && !isAdmin` に拡張する（`DRAFT`でも本人は再編集できる。`ADMIN`は既存どおり編集対象外のまま）
- **正式申請の導線**：`DRAFT` かつ本人の場合、編集画面（`/reservations/{id}/edit`）への遷移後に「正式申請」操作を行う設計とする（US-03）。詳細ページ自体に専用ボタンを追加するか編集画面に集約するかは、既存の「編集」導線との一貫性を踏まえ Code Generation 時に確定する
- `statusBadgeClass`（既にDRAFT対応済み）は変更不要

## `.../reservations/[id]/edit/page.tsx`（改修）

- アクセス制御（現状 `if (isAdmin || !isOwner || reservation.status !== "PENDING") { notFound(); }`）を `if (isAdmin || !isOwner || !["PENDING", "DRAFT"].includes(reservation.status)) { notFound(); }` に拡張する

## `.../reservations/[id]/edit/ReservationEditForm.tsx`（改修）

- 編集対象予約が `DRAFT` の場合のみ「正式申請」ボタンを追加表示する（`PENDING` の場合は現状どおり「更新」ボタンのみ）
- 「正式申請」クリック時は `updateReservationAction({ ...values, submit: true })` を呼ぶ。通常の「更新」（内容保存のみ）は `submit: false` または省略
- 正式申請後の遷移先・成功メッセージは既存の更新成功時の挙動（`/reservations/{id}` へ戻る等）を踏襲する

## `frontend/src/lib/schemas/reservation.ts`（改修）

- `CreateReservationSchema` に `draft: z.boolean().optional()` を追加
- `UpdateReservationSchema` に `submit: z.boolean().optional()` を追加

## `frontend/src/server/actions/reservations.ts`（改修）

- `createReservationAction`・`updateReservationAction` は既存どおり input をそのまま POST/PUT ボディへ変換しているため、Zod スキーマに `draft`/`submit` を追加すれば自動的に中継される（関数本体のロジック変更は不要な可能性が高い。Code Generation 時に型定義の反映のみ確認する）
