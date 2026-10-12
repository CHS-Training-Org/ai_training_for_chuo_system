# Frontend Components — recurring-reservation

## 変更するファイルと役割

| ファイル | 変更 |
|---|---|
| `lib/types/enums.ts` | `RecurrenceTypeSchema`（`NONE` / `WEEKLY` / `MONTHLY`）と型 `RecurrenceType` を追加 |
| `lib/types/api.ts` | `ReservationResponseSchema` に 5 項目を追加 |
| `lib/labels.ts` | `RECURRENCE_TYPE_LABELS` を追加 |
| `lib/schemas/reservation.ts` | `CreateReservationSchema` に `recurrenceType`・`recurrenceUntil` を追加し、2 つの `.refine` を足した `CreateReservationFormSchema` を export する |
| `server/actions/reservations.ts` | `createReservationAction` の戻り値を配列に変更 |
| `app/(authenticated)/reservations/new/ReservationForm.tsx` | 繰り返しの Select と終了日、検証、トースト |
| `app/(authenticated)/reservations/[id]/page.tsx` | シリーズ情報の表示 |
| `tests/unit/msw/handlers.ts` | `POST /reservations` が配列を返すよう変更 |

## 型とスキーマ

**`ReservationResponseSchema`**（後方互換のため、追加項目は省略可能にする。既存のテストの fixtures を壊さない）：

- `seriesId: z.string().uuid().nullish()`
- `recurrenceType: RecurrenceTypeSchema.optional()`
- `recurrenceUntil: z.string().nullish()`
- `seriesCount: z.number().int().nullish()`
- `remainingCount: z.number().int().nullish()`

**`CreateReservationSchema`**：`recurrenceType: RecurrenceTypeSchema.optional()` と `recurrenceUntil: z.string().nullable().optional()` を追加する。スキーマは `"use server"` ファイルから export できない制約のため、`lib/schemas/reservation.ts` に置く（現状どおり）。

**ラベル**：`RECURRENCE_TYPE_LABELS: Record<string, string>`（`NONE` は「繰り返さない」、`WEEKLY` は「毎週」、`MONTHLY` は「毎月」）。フォームの Select と詳細画面で共用する。

## `ReservationForm`（Client Component）

**構成**：既存のフィールドの並び（リソース、開始日時、終了日時、利用目的、参加人数）のうち、終了日時と利用目的の間に「繰り返し」を置く。

1. 「繰り返し」：`FormField`（`recurrenceType`）。既存の `Select` と `SelectItem` を使い、3 つの選択肢を `RECURRENCE_TYPE_LABELS` から出す
2. 「繰り返し終了日 *」：`FormField`（`recurrenceUntil`）。`<Input type="date" {...field} value={field.value ?? ""} />`。`form.watch("recurrenceType")` が `NONE` 以外のときだけ描画する

**フォームの値と初期値**：`recurrenceType` は `"NONE"`、`recurrenceUntil` は `""`。

**検証（`CreateReservationFormSchema` の `.refine`。既存の `endAt > startAt` の検証もここへ移し、フォームは `zodResolver(CreateReservationFormSchema)` を使う）**：

- 種別が `NONE` 以外で `recurrenceUntil` が空なら、「繰り返し終了日は必須です」（`path: ["recurrenceUntil"]`）
- 種別が `NONE` 以外で、`recurrenceUntil` が `startAt` の日付部分（先頭 10 文字）より前なら、「繰り返し終了日は開始日以降にしてください」（`path: ["recurrenceUntil"]`）。`startAt` が空のときは判定しない（開始日時の必須メッセージに任せる）

**送信（`submitForm(draft)`）**：

1. `values` から送信用の入力を作る。種別が `NONE` なら `recurrenceUntil` を含めない（BR-27）。`NONE` 以外なら `recurrenceUntil` を含める
2. `const created = await createReservationAction({ ...input, draft })`
3. 成功したら `toast.success(`${created.length} 件の予約を登録しました`)` を出し、`router.push(draft ? "/reservations?status=DRAFT" : "/reservations")`
4. 失敗は現行と同じ。`RESERVATION_CONFLICT` は既存の固定文言を `conflictError` に入れ、それ以外は再 throw する

**状態**：既存の `isPending`・`conflictError` のまま。新しい状態は増やさない（種別の変化は `form.watch` で足りる）。

**「繰り返さない」に戻したとき**：`recurrenceUntil` の入力値はフォームに残るが、送信時に除くため API には届かない。欄は非表示になる。再び「毎週」に切り替えると、前の入力値がそのまま見える。

**判断**：下書き保存ボタンは、繰り返しの選択にかかわらず有効のまま（要件の決定事項で併用可）。

## Server Action（`server/actions/reservations.ts`）

`createReservationAction` の戻り値を `Promise<ReservationResponse[]>` にし、`client.post("/reservations", body, z.array(ReservationResponseSchema))` で受ける。`zod` を import する（既存ファイルは未 import）。`api-client` の `post` は `schema.parse(json)` のため、変更しない。

- `startAt`・`endAt` の秒補完は現行のまま。`recurrenceUntil` は日付のみで、補完しない
- 呼び出し元は `ReservationForm` だけ（`grep` で確認済み）

## 詳細画面（`reservations/[id]/page.tsx`、Server Component）

既存の `<dl>`（2 列のグリッド）に、`reservation.recurrenceType` が存在し `NONE` でないときだけ、次の 4 組を足す（「更新日時」の前に置く）。

| 見出し | 値 |
|---|---|
| 繰り返し | `RECURRENCE_TYPE_LABELS[recurrenceType]` |
| 繰り返し終了日 | `recurrenceUntil` を日付で表示（`new Date(...).toLocaleDateString("ja-JP")`） |
| シリーズ件数 | `seriesCount` を「N 件」と表示。null のときは行を出さない |
| 残り回数 | `remainingCount` を「N 回」と表示。null のときは行を出さない |

`NONE` のときと、旧形式のレスポンス（項目なし）のときは、欄を出さない。一覧画面（`reservations/page.tsx`）は変更しない。

## API 連携の対応

| 画面・部品 | エンドポイント | 備考 |
|---|---|---|
| `ReservationForm` | `POST /api/reservations` | 配列で受ける。400（終了日の検証）はクライアントの検証で通常は届かず、届いた場合は再 throw でエラーバウンダリへ |
| 詳細画面 | `GET /api/reservations/{id}` | シリーズ情報の 5 項目を読む |
| 一覧画面 | `GET /api/reservations` | 変更なし。新項目は読まない |

## テストの変更

- `reservation-form.test.tsx`：`createReservationAction` のモックの戻り値を配列にする。追加するケースは `business-rules.md` の対応表（BR-26〜BR-29）
- `server/actions/reservations.test.ts`：create の正常系を配列に変更し、複数件のケースと 409 を維持する
- `reservation-detail-page.test.tsx`：シリーズ情報の表示と `NONE` で欄が出ないケースを追加する
- `tests/unit/msw/handlers.ts`：`POST /reservations` が、1 件の配列を 201 で返すようにする
- E2E（`reservation-flow.spec.ts`）：既存のフローは「繰り返さない」で、画面のラベルと遷移が変わらないため、変更しない。繰り返しの E2E は追加しない（Radix Select の操作は既存の E2E が行っているため追加は可能だが、本ユニットでは単体テストで担保する）
- **検証ルールのテスト**：`FormSchema`（`CreateReservationSchema` に 2 つの `.refine` を足したもの）を、`lib/schemas/reservation.ts` から `CreateReservationFormSchema` として export し、コンポーネントから import する。`.refine` は `"use server"` ファイルでなければ export できるため、この移動は制約に反しない。Vitest で `safeParse` を直接呼び、終了日の必須・開始日より前・`NONE` で不要、を画面なしで検証する
- **画面の挙動のテスト**：Radix Select は jsdom で開けない（`hasPointerCapture` 等が未実装）。「毎週」を選んで終了日の欄が現れる挙動は、テストファイル内で `Element.prototype.hasPointerCapture`・`scrollIntoView` を補う（polyfill）ことで Select を操作して確認する。polyfill で安定しなかった場合に限り、`ReservationForm` に省略可能な `defaultRecurrenceType` を足し（既存の `defaultResourceId`・`defaultStartAt` と同じ流儀）、初期値で再現する。どちらを採ったかは Code Generation の記録に残す
