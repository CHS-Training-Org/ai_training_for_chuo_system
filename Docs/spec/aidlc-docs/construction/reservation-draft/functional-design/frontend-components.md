# Frontend Components — `reservation-draft`

**ユニット**: `reservation-draft`
**作成日時**: 2026-10-02T11:02:40+00:00

変更する画面は4つ、新規に作るコンポーネントは1つである。
Server Components 優先の方針を維持し、クライアント状態を増やさない。

---

## 1. Server Action のシグネチャ

`draft` と `status` はいずれもフォームの入力項目ではなく、押されたボタンの種別を表す。
Zod スキーマに含めると、利用者が入力していない値がフォームの状態に混ざる。
したがって Server Action の引数として渡す。

```ts
// 第2引数を追加。省略時は従来どおり。
export async function createReservationAction(
  input: CreateReservationInput,
  draft?: boolean,
): Promise<ReservationResponse>

// 第3引数を追加。省略時は内容のみの更新。
export async function updateReservationAction(
  id: string,
  input: UpdateReservationInput,
  status?: "PENDING",
): Promise<ReservationResponse>
```

この設計により、`lib/schemas/reservation.ts` の `CreateReservationSchema` と `UpdateReservationSchema`、
およびそこから導出される `CreateReservationInput` と `UpdateReservationInput` は変更不要になる。
要件定義 §8 が挙げた波及範囲は4箇所から2箇所に減る。

リクエストボディの組み立てでは、`draft` と `status` が渡されたときのみフィールドを足す。
省略時に `undefined` を送らないことで、バックエンドの既存経路の振る舞いを変えない。

---

## 2. 予約申請フォーム（`/reservations/new`）

対象: `ReservationForm.tsx`（既存のクライアントコンポーネント）

### 変更内容

送信ボタンの並びに「下書き保存」を追加する。
現在は「予約を申請する」と「キャンセル」の2つが並んでいる。

```
+--------------------+  +------------------+  +------------+
| 予約を申請する     |  | 下書き保存       |  | キャンセル |
+--------------------+  +------------------+  +------------+
     type=submit            type=button          type=button
     variant=default        variant=secondary    variant=outline
```

### 実装の要点

下書き保存ボタンは `type="button"` とし、`form.handleSubmit(handler)()` を明示的に呼ぶ。
これにより、通常の送信と同じ Zod バリデーションが走る（AC-01-5）。
`type="submit"` を2つ置くと、どちらが押されたかをハンドラで判別する必要が生じるため避ける。

送信処理は既存の `handleSubmit` を拡張し、下書きかどうかを引数で受ける。

- 成功時の遷移先を分ける。通常の申請は従来どおり `/reservations` へ、下書き保存は作成された予約の詳細画面へ遷移する（AC-01-6）。詳細画面へ送るのは、保存した内容をその場で確認でき、正式申請の導線にもつながるため
- 重複エラー（409）の扱いは通常の申請だけに必要である。下書き保存では重複チェックが走らないため 409 は返らない
- 処理中のボタン表示は「保存中...」とする

### 受入基準との対応

| 受入基準 | 対応 |
|---|---|
| AC-01-1 | 下書き保存ボタンの追加と `draft` の送信 |
| AC-01-5 | `form.handleSubmit` 経由でのバリデーション |
| AC-01-6 | 成功時に詳細画面へ遷移 |

---

## 3. 予約一覧（`/reservations`）

対象: `page.tsx`（Server Component）

### 変更内容

`ALL_STATUSES` に `"DRAFT"` を加える。
タブの並び順は、予約の流れに沿って `DRAFT` を先頭に置く。

```ts
const ALL_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];
```

`STATUS_VARIANTS` と `statusBadgeClass` には既に `DRAFT` の定義があるため、バッジの表示は変更不要である。
表示ラベル「ドラフト」も `RESERVATION_STATUS_LABELS` に定義済みである。

バックエンドの `GET /api/reservations` は既に複数ステータスの絞り込みを受け付けるため、API 側の変更はない。

### 受入基準との対応

| 受入基準 | 対応 |
|---|---|
| AC-02-1 | `ALL_STATUSES` への追加 |
| AC-02-2 | 既存の `status` クエリパラメータによる絞り込み |
| AC-02-3 | 既存の「すべて」タブ |
| AC-02-4 | 既存のバッジ定義 |

---

## 4. 予約詳細（`/reservations/{id}`）

対象: `page.tsx`（Server Component）

### 変更内容

編集ボタンの表示条件に `DRAFT` を加え、正式申請ボタンを新設する。

```ts
const EDITABLE_STATUSES = ["DRAFT", "PENDING"];
const canEdit = EDITABLE_STATUSES.includes(reservation.status) && isOwner && !isAdmin;
const canSubmitDraft = reservation.status === "DRAFT" && isOwner && !isAdmin;
```

`!isAdmin` を条件に残すのは、ADMIN に更新権限がないという既存の権限マトリクスに従うためである（AC-07-4）。

ボタンの並び順は、編集、正式申請、キャンセルとする。
`DRAFT` ではキャンセルボタンが表示されない（`CANCELLABLE_STATUSES` が `DRAFT` を含まないため）。

### 新規コンポーネント `SubmitDraftButton`

対象: `reservations/[id]/SubmitDraftButton.tsx`（新規・クライアントコンポーネント）

既存の `CancelButton` と同じ構造にする。
正式申請は承認依頼を発生させる後戻りしにくい操作であり、キャンセルと同じ重みを持つため、確認ダイアログを置く。

```ts
export function SubmitDraftButton({
  reservationId,
  values,   // startAt / endAt / purpose / attendeesCount の現在値
}: {
  reservationId: string;
  values: UpdateReservationInput;
}) 
```

現在値を props で受け取るのは、`PUT /api/reservations/{id}` が全項目を必須とするためである。
正式申請のリクエストは、詳細画面が表示している値をそのまま送る。

内部の構造は `CancelButton` に揃える。

- `Dialog` で確認を取る。本文は「この予約を正式に申請します。よろしいですか？」とし、承認が必要なリソースでは承認者に通知が渡る旨を添える
- `useTransition` で処理中を表し、ボタン表示を「申請中...」に切り替える
- 成功時は `router.refresh()` でサーバーコンポーネントを再描画する。ステータス表示が更新され、正式申請ボタンが消える（AC-04-8）
- 409 `RESERVATION_CONFLICT` を捕捉し、「指定した時間帯は既に予約が入っています。日時を変更してから再度申請してください。」と表示する。`ReservationForm` の重複エラー表示と同じ文言の方針に揃える（AC-04-4）

重複エラーの捕捉は `CancelButton` にはない要素である。
正式申請は下書き保存の時点で重複チェックを通っておらず、ここで初めて競合が判明しうるため、
エラーを捕捉せずに投げると Next.js の既定エラー画面に飛んでしまい、利用者が何をすればよいか分からなくなる。

### 受入基準との対応

| 受入基準 | 対応 |
|---|---|
| AC-03-1 | `EDITABLE_STATUSES` への `DRAFT` 追加 |
| AC-04-1 | `SubmitDraftButton` の表示条件 |
| AC-04-8 | `router.refresh()` による再描画 |
| AC-07-4 | `!isAdmin` 条件の維持 |

---

## 5. 予約編集（`/reservations/{id}/edit`）

対象: `page.tsx`（Server Component）

### 変更内容

要件定義 §8 のとおり、3箇所を直す。

1. `notFound()` の条件を `reservation.status !== "PENDING"` から、`DRAFT` と `PENDING` のいずれでもない場合に広げる
2. 画面の説明文「承認待ち（PENDING）の予約の日時・目的・参加人数を変更できます。」を、下書きと承認待ちの双方を指す文言に改める
3. ファイル冒頭の Javadoc コメントの「`PENDING` 以外の予約は編集対象外」という記述を実態に合わせる

`ReservationEditForm.tsx` は変更しない。
更新の送信内容は下書きでも承認待ちでも同じであり、`updateReservationAction` の `status` を省略した呼び出しがそのまま使える。

### 受入基準との対応

| 受入基準 | 対応 |
|---|---|
| AC-03-3 | `notFound()` 条件の緩和 |

---

## 6. 利用者の操作の流れ

```
/reservations/new
   |
   | 内容を入力して「下書き保存」
   v
/reservations/{id}          ステータス: ドラフト
   |                        表示されるボタン: 編集、正式申請
   |
   +---- 「予約内容を編集する」 ----> /reservations/{id}/edit
   |                                        |
   |                                        | 保存
   |                                        v
   |                                  /reservations/{id}
   |
   +---- 「正式に申請する」 ----> 確認ダイアログ
                                       |
                                       +-- 成功 --> 同じ画面を再描画
                                       |            ステータス: 承認待ち or 承認済み
                                       |            正式申請ボタンは消える
                                       |
                                       +-- 409 --> ダイアログ内にエラー表示
                                                    ステータスはドラフトのまま
```

一覧からの導線は、`/reservations` の「ドラフト」タブから各行の「詳細」ボタンで同じ詳細画面に入る。

---

## 7. テストの方針

frontend のユニットテスト（Vitest + MSW）で検証する範囲を定める。

- `ReservationForm`: 下書き保存ボタンの押下で `draft` が `true` として送られること、未入力時にバリデーションエラーが出ること
- 予約一覧: 「ドラフト」タブが描画され、選択時に `status=DRAFT` のクエリが付くこと
- 予約詳細: ステータスとロールの組み合わせでボタンの表示が切り替わること（とくに ADMIN で編集と正式申請が出ないこと）
- `SubmitDraftButton`: 確認ダイアログの表示、成功時の再描画、409 時のエラー表示

403 を受けたときの画面表示はテストの対象に含めない。
frontend にエラーバウンダリが存在せず、既存の挙動と同一になるため（要件定義 §8）。
