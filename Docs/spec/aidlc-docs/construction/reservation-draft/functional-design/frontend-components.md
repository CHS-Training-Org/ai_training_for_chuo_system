---
type: working-doc
title: Frontend Components（ユニット：reservation-draft）
description: AI-DLC Functional Design ステージが生成する、フロントエンドの部品・状態・API の対応
timestamp: 2026-11-14
---

# Frontend Components — reservation-draft

**略記**: `FE/` = `frontend/src/`、`R/` = `FE/app/(authenticated)/reservations/`

## 変更する部品

| 部品 | 変更 |
|---|---|
| `FE/lib/api-client.ts` | `deleteEmpty(path)` を追加（`request("DELETE", path)` を呼び、ボディなしで返す） |
| `FE/server/actions/reservations.ts` | `createReservationAction` と `updateReservationAction` に、任意の第 2 引数（`{ draft?: boolean }`）を追加。`deleteReservationAction(id)` を新設 |
| `FE/lib/labels.ts` | `DRAFT` の表示名を「ドラフト」から「下書き」に変更 |
| `R/new/ReservationForm.tsx` | 「下書き保存」ボタンを追加 |
| `R/[id]/edit/page.tsx` | `DRAFT` でも開けるようにする |
| `R/[id]/edit/ReservationEditForm.tsx` | 予約の状態を受け取り、ボタンを切り替える |
| `R/[id]/page.tsx` | 「編集」の条件に `DRAFT` を加え、「正式申請」「削除」を追加 |
| `R/[id]/SubmitDraftButton.tsx` | **新規**。詳細画面の「正式申請」ボタン |
| `R/[id]/DeleteDraftButton.tsx` | **新規**。詳細画面の「削除」ボタンと確認ダイアログ |
| `R/page.tsx` | 「下書き」タブを追加 |

入力スキーマ（`FE/lib/schemas/reservation.ts`）は変更しない。下書きでも必須項目は同じで、`draft` はフォームの値ではなく、Server Action の引数で渡すため。

## 予約申請フォーム（`R/new/ReservationForm.tsx`）

- **ボタン**: 「予約を申請する」（既存）、「下書き保存」（新規。`type="button"`）、「キャンセル」（既存）
- **検証**: 既存の `FormSchema`（必須項目と「終了 > 開始」）を、下書き保存でも使う。フォームの `handleSubmit(...)` を、下書き保存のボタンからも呼ぶ。
- **下書き保存の処理**: `createReservationAction(values, { draft: true })` を呼び、成功したら `/reservations?status=DRAFT` へ遷移する。重複の 409 は返らないため、重複エラーの表示は不要。
- **状態**: 既存の `isPending`（二重送信の防止）を、2 つのボタンで共有する。

## 編集画面（`R/[id]/edit`）

- **ページ**: 次のとき以外は 404 にする。本人で `DRAFT`（ADMIN を含む）、または、ADMIN を除く本人で `PENDING`。
- **フォーム**: `status` を props で受け取る。
  - `PENDING` のとき: 「更新する」（既存の動作）。
  - `DRAFT` のとき: 「下書き保存」（`updateReservationAction(id, values, { draft: true })`）と「申請する」（`updateReservationAction(id, values)`）。
- **成功後**: どのボタンでも `/reservations/{id}` へ遷移する（画面仕様書）。
- **エラー**: 「申請する」と「更新する」で 409 が返ったら、既存の重複メッセージを表示する。「下書き保存」では 409 は返らない。

## 詳細画面（`R/[id]/page.tsx`）

```text
canEdit   = (status が PENDING かつ 本人 かつ ADMIN でない) または (status が DRAFT かつ 本人)
canSubmit = status が DRAFT かつ 本人（ADMIN を含む）
canDelete = status が DRAFT かつ 本人（ADMIN を含む）
canCancel = 既存のまま（PENDING または APPROVED、かつ 本人 または ADMIN）
```

### SubmitDraftButton

- **props**: 予約の ID と、現在の値（開始、終了、目的、参加人数）。
- **処理**: 開始と終了を、編集画面の初期値と同じく先頭 16 文字（`YYYY-MM-DDTHH:mm`）にそろえたうえで、`updateReservationAction(id, values)` を呼ぶ（`draft` は指定しない。`toIsoWithSeconds` が秒を補う）。
- **成功**: `router.refresh()` で詳細画面を更新する（状態が `PENDING` または `APPROVED` に変わる）。
- **409**: 「指定した時間帯は既に予約が入っています」を、ボタンの近くに表示する。
- **状態**: `isPending`（二重送信の防止）、エラーメッセージ。

### DeleteDraftButton

- **作り**: 既存の `CancelButton` と同じ（`Dialog` の確認、`useTransition`、`isPending`）。ボタンは `variant="destructive"`。
- **確認文**: 「この下書きを削除します。よろしいですか？削除した下書きは元に戻せません。」
- **処理**: `deleteReservationAction(id)` を呼び、成功したら `/reservations` へ遷移する。
- **状態**: `open`、`isPending`。

## 予約一覧（`R/page.tsx`）

- **タブ**: 既存の「すべて」と 4 状態に加え、末尾に「下書き」を追加する。リンクは `?status=DRAFT`。「すべて」は `status` を付けない（バックエンドが下書きを除く）。
- **ステータスバッジ**: 既存の `STATUS_VARIANTS` と `statusBadgeClass`（`DRAFT` は定義済み）を使う。
- **ADMIN**: 「下書き」タブに全ユーザーの下書きが出る（バックエンドの挙動）。画面側の追加処理はない。

## API の対応

| 部品 | エンドポイント |
|---|---|
| 申請フォームの「予約を申請する」 | `POST /api/reservations` |
| 申請フォームの「下書き保存」 | `POST /api/reservations`（`draft: true`） |
| 編集画面の「更新する」「申請する」、詳細画面の「正式申請」 | `PUT /api/reservations/{id}` |
| 編集画面の「下書き保存」 | `PUT /api/reservations/{id}`（`draft: true`） |
| 詳細画面の「削除」 | `DELETE /api/reservations/{id}` |
| 一覧のタブ | `GET /api/reservations`（`status` の指定あり／なし） |

## テストで追加する観点

- Server Action: `draft` の有無で、送信する本文が変わること。`deleteReservationAction` が `DELETE` を呼ぶこと。
- MSW のモック: `POST` で `draft: true` のとき `status: "DRAFT"` を返すこと。`DELETE` のハンドラを追加すること。
- `api-client`: `deleteEmpty` が `DELETE` を送ること。
