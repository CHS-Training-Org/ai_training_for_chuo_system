# Frontend Code Summary — recurring-reservation

Code Generation の Step 8 から Step 11 の記録。設計は `functional-design/frontend-components.md` に従った。

## 変更ファイル

**Created**

- `frontend/tests/unit/reservation-form-schema.test.ts`：`CreateReservationFormSchema` の検証ルール（終了日の必須、開始日より前、開始日と同じ日、`NONE` での不要、開始日時が空のとき）を画面なしで検証。11 件

**Modified**

- `src/lib/types/enums.ts`：`RecurrenceTypeSchema`・`RecurrenceType`
- `src/lib/types/api.ts`：`ReservationResponseSchema` に 5 項目を `nullish()` / `optional()` で追加（旧形式のレスポンスと既存 fixtures を壊さない）
- `src/lib/labels.ts`：`RECURRENCE_TYPE_LABELS`
- `src/lib/schemas/reservation.ts`：`CreateReservationSchema` に 2 項目、`CreateReservationFormSchema`（3 つの `.refine`）と `CreateReservationFormValues` を export。冒頭と `CreateReservationSchema` の Javadoc にあった「Server Action 側でも検証」という記述を、実態（クライアントのみ）に直した
- `src/server/actions/reservations.ts`：`createReservationAction` が `ReservationResponse[]` を返す（`z.array(ReservationResponseSchema)`）。`api-client` は変更なし
- `src/app/(authenticated)/reservations/new/ReservationForm.tsx`：繰り返しの Select（`data-testid="reservation-form-recurrence-type"`）、条件付きの終了日（`reservation-form-recurrence-until`）、`CreateReservationFormSchema` の利用、「繰り返さない」で終了日を送らない処理、件数付きの `toast.success`
- `src/app/(authenticated)/reservations/[id]/page.tsx`：シリーズ情報（種別、終了日、シリーズ件数、残り回数）。`NONE` と旧形式では出さない。終了日は `Date` を通さず文字列で整形（タイムゾーンで日がずれないように）
- `tests/unit/msw/handlers.ts`：`POST /reservations` が 1 件の配列を返す。`MOCK_RESERVATION_RESPONSE` に 5 項目を追加
- `tests/unit/server/actions/reservations.test.ts`：create を配列に追従。繰り返しのペイロード、複数件の配列、400 の 3 件を追加
- `tests/unit/reservation-form.test.tsx`：配列のモックに追従。繰り返し予約の 9 件を追加
- `tests/unit/reservation-detail-page.test.tsx`：シリーズ情報の 6 件を追加
- `tests/unit/reservations-page.test.tsx`：一覧にシリーズ情報が出ないことの 1 件を追加

## 設計からの差分と、実装中に見つけた事実

- **Radix Select は、テスト内の polyfill で操作できた**：`hasPointerCapture`・`setPointerCapture`・`releasePointerCapture`・`scrollIntoView` を `beforeAll` で補うと、jsdom で Select を開いて選択肢を選べた（設計の「不安定なら省略可能な `defaultRecurrenceType` の props に切り替える」案は使わなかった）。この polyfill は `reservation-form.test.tsx` 内にあり、他のテストには影響しない
- **種別の検証を `lib/schemas/reservation.ts` に移した**：既存の `endAt > startAt` の検証も、コンポーネント内の `FormSchema` から `CreateReservationFormSchema` に移した。`ReservationForm` は `zodResolver(CreateReservationFormSchema)` だけを使う
- **既存のテストの戻り値**：`createReservationActionMock.mockResolvedValue({})` を、配列（`[{}]`）に直した。`created.length` を使うため、配列でないとトーストの件数が壊れる

## 検証結果

- `pnpm lint`：成功
- `pnpm format:check`：成功（`pnpm format` で整形を適用した後）
- `pnpm test`：全 32 ファイル、264 件が成功
- `NODE_OPTIONS=--max-old-space-size=1536 pnpm build`：成功（型チェックを含む）
- **break-and-verify**（4 件、すべて失敗を確認して復元）：終了日の必須検証を外す（4 件失敗）、「繰り返さない」でも終了日を送る（2 件）、トーストの件数を固定にする（2 件）、`NONE` でもシリーズ情報を表示する（2 件）

## ストーリーの最終確認（Step 12）

`business-rules.md` の対応表と、各 Scenario のテストを照合した。足りなかった 4 点は backend の結合テストで補った（`backend-summary.md` 参照）。

| ストーリー | 検証しているテスト |
|---|---|
| US-01 毎週 | `RecurrenceScheduleTest`（件数・終了日当日・翌日の除外・年またぎ）、`ReservationServiceTest.CreateRecurring`（日をまたぐ長さ・同一の系列）、`ReservationControllerTest`（昇順の配列・各項目） |
| US-02 毎月 | `RecurrenceScheduleTest`（31 日のスキップ・基準日からの数え直し・28 日以前・うるう年）、`ReservationServiceTest`・`ReservationControllerTest` の 31 日の例 |
| US-03 重複時の全件失敗 | Service と Controller で、既存の `APPROVED`・`PENDING` との重複、自己重複（下書きを含む）、承認者不在のロールバック、固定文言。隣接は重複でない（Service） |
| US-04 検証と従来互換 | Service と Controller で、`NONE` の 1 件の配列、400 の 3 パターンと定義外の値、終了日が開始日と同じ日、終了日の上限（開始日から 2 年以内）。フォーム側は `reservation-form-schema.test.ts` |
| US-05 下書き・承認 | Service と Controller で、全件 `DRAFT`・`PENDING`（承認ステップが件数分）・`APPROVED`、各回の `submit`、各回の承認と却下 |
| US-06 個別管理 | `ReservationControllerTest`：一覧に個別に並ぶ、1 件だけキャンセル、1 件だけ `submit`。一括操作は存在しない（操作そのものを作っていないため、テストはない） |
| US-07 フォーム | `reservation-form.test.tsx`：初期値、「毎週」で終了日が現れる、「繰り返さない」に戻すと消える、必須・範囲のエラー、ペイロード、トースト、下書きの遷移、409 |
| US-08 詳細画面 | `ReservationServiceTest.GetSeries`、`ReservationControllerTest`（詳細の 5 項目・キャンセル済みも数える・最後の回は 0・一覧は null）、`reservation-detail-page.test.tsx`、`reservations-page.test.tsx` |

## 自動テストで検証できていないこと（Build and Test に引き継ぐ）

- V003 の PostgreSQL での適用と 2 つの CHECK 制約、`ddl-auto: validate` での起動（`backend-summary.md` 参照）
- ロック下の一括作成の並行性（同時に 2 つの繰り返し申請を送る）
- ブラウザでの手動確認：繰り返しの入力、終了日欄の表示切替、トースト、詳細画面のシリーズ情報。Playwright の E2E は、既存のフロー（繰り返さない）が変わらないため、変更も追加もしていない
- 画面遷移図・ER 図（drawio の SVG）は、今回の変更を反映していない（ER 図は表を正とする注記を `er-diagram.md` に追記した）

## PR #150 の AI レビュー対応（終了日の上限）

- `lib/schemas/reservation.ts`：`CreateReservationFormSchema` に、終了日が開始日から 2 年を超えたら「繰り返し終了日は開始日から 2 年以内にしてください」を出す `.refine` を追加。`MAX_RECURRENCE_YEARS = 2`（BE と一致）。2 年後の計算は、2 月 29 日が平年に丸まる BE の `plusYears` に合わせて自前の `addYears`（`Date` の月末オーバーフローを避ける）
- テスト：`reservation-form-schema.test.ts`（ちょうど 2 年は通る、翌日はエラー、毎月、2 月 29 日）、`reservation-form.test.tsx`（超過で送信されない）
