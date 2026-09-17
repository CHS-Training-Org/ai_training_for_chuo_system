# Frontend Components — reservation-draft

既存コードを確認した結果、`DRAFT` のラベル（`RESERVATION_STATUS_LABELS.DRAFT = "ドラフト"`）とバッジスタイル（`STATUS_VARIANTS.DRAFT`/`statusBadgeClass` の `DRAFT` エントリ）は **`frontend/src/lib/labels.ts`・`reservations/page.tsx`・`reservations/[id]/page.tsx` にすでに用意済み**で変更不要。実際に必要な変更は次のとおり、想定より小さい。

## 1. `lib/schemas/reservation.ts`（スキーマ拡張）

- `CreateReservationSchema` に `draft: z.boolean().optional()` を追加
- `UpdateReservationSchema` に `submit: z.boolean().optional()` を追加

## 2. `server/actions/reservations.ts`（変更不要）

`createReservationAction`/`updateReservationAction` はどちらも `{ ...input, startAt: ..., endAt: ... }` で body を組み立てて渡しているため、スキーマに `draft`/`submit` を追加すれば自動的に body に含まれる。**Server Action 自体のコード変更は不要**。

## 3. `reservations/new/ReservationForm.tsx`（下書き保存ボタン、Story 1）

- `handleSubmit` を汎用化し、`draft: boolean` を受け取って `createReservationAction({ ...values, draft })` を呼べるようにする
- ボタンを2つにする：「予約を申請する」（`draft: false`、既存）と「下書き保存」（`draft: true`、新規）
- バリデーション（`FormSchema`）は変更しない。下書き保存でも全項目必須のまま（`requirements.md` D1）
- 重複エラー（409）表示は「下書き保存」では発生しない設計（D5）だが、コンポーネント側で分岐する必要はない（下書き保存時はサーバー側がそもそもチェックしないため 409 が返らない）

## 4. `reservations/page.tsx`（DRAFTタブ、Story 2）

- `ALL_STATUSES` 配列に `"DRAFT"` を追加するのみ（`["PENDING", "APPROVED", "REJECTED", "CANCELLED"]` → 先頭に `"DRAFT"` を追加）。ラベル・バッジスタイルは既存のエントリがそのまま使われる

## 5. `reservations/[id]/page.tsx`（詳細ページ、Story 3・4・5）

- `canEdit` の条件を `reservation.status === "PENDING"` から `["PENDING", "DRAFT"].includes(reservation.status)` に拡張（本人のみ・ADMIN不可は既存のまま）
- `CANCELLABLE_STATUSES` に `"DRAFT"` を追加
- 新規コンポーネント `SubmitButton`（`CancelButton.tsx` と同じ構造：確認ダイアログ付きの `"use client"` コンポーネント）を追加し、`reservation.status === "DRAFT" && isOwner` の場合にのみ表示する
  - クリック時、`updateReservationAction(reservation.id, { startAt: reservation.startAt, endAt: reservation.endAt, purpose: reservation.purpose, attendeesCount: reservation.attendeesCount, submit: true })` を呼ぶ（ユーザーに新規入力を求めず、保存済みの値をそのまま送信する。functional-design/business-logic-model.md の設計決定）
  - 409（`RESERVATION_CONFLICT`）を捕捉した場合は「下書き保存中に指定した時間帯の予約が埋まりました。内容を確認し再編集してください」等のメッセージを表示する（既存の409メッセージパターンを踏襲）
- `DRAFT` の場合、APPROVER が他人の下書きにアクセスした際は BE が 403 を返す（既存の「他人の予約は 403 → エラー画面」という処理経路をそのまま利用。フロント側の分岐追加は不要）

## 6. `reservations/[id]/edit/page.tsx`・`ReservationEditForm.tsx`（Story 4）

- `page.tsx` の `notFound()` ガード条件を `reservation.status !== "PENDING"` から `!["PENDING", "DRAFT"].includes(reservation.status)` に拡張
- `page.tsx` の見出し・説明文を、ステータスに応じて出し分ける（`DRAFT` の場合は「下書きを編集する」「下書きの内容を変更して保存し直せます（正式申請は予約詳細ページから行います）」等）
- `ReservationEditForm.tsx` の送信処理自体は変更不要（`submit` を付けずに `updateReservationAction` を呼ぶため、`DRAFT` は `DRAFT` のまま更新される。functional-design/business-logic-model.md のフロー 4b）

## コンポーネント一覧（新規・変更）

| コンポーネント | 種別 | Props | 状態 | API連携 |
|---|---|---|---|---|
| `SubmitButton`（新規） | Client Component | `reservationId: string`, `currentValues: { startAt, endAt, purpose, attendeesCount }` | `open`（確認ダイアログ）, `isPending` | `updateReservationAction`（`submit: true`） |
| `ReservationForm`（変更） | Client Component | 既存＋なし（内部で `draft` を分岐） | 既存＋なし | `createReservationAction`（`draft` 追加） |
| `ReservationsPage`（変更） | Server Component | 既存のまま | — | 既存のまま |
| `ReservationDetailPage`（変更） | Server Component | 既存のまま | — | 既存のまま |
| `ReservationEditPage`（変更） | Server Component | 既存のまま | — | 既存のまま |
| `ReservationEditForm`（変更なし） | Client Component | 既存のまま | 既存のまま | 既存のまま |
