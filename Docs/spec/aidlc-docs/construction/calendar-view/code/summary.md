# Code Generation Summary: calendar-view

- **Unit**: `calendar-view`（Issue #27、frontend のみ）
- **Plan**: `Docs/spec/aidlc-docs/construction/plans/calendar-view-code-generation-plan.md`
- **Backend**: 変更なし（`git diff --stat -- backend` が空）。`getAvailabilityAction`、`AvailabilitySlotSchema` も変更なし

## 変更・新規ファイル

| 区分 | ファイル | 内容 |
|---|---|---|
| 仕様 | `docs-next/docs/spec/screen-spec.md` | `/resources/{id}` に空き状況カレンダー（`view`/`date`、枠の 4 状態、月表示、取得失敗時）を追記。`/reservations/new` に `startAt`/`endAt` を追記。画面一覧の説明を更新 |
| 仕様 | `docs-next/docs/spec/requirements.md` | UC-02 に RES-09 から RES-11 を追記 |
| 新規 | `frontend/src/app/(authenticated)/resources/[id]/availability/calendar-utils.ts` | 期間算出、検証、占有判定、枠の状態、リンク生成の純関数 |
| 新規 | 同 `WeekGrid.tsx` / `MonthGrid.tsx` / `CalendarToolbar.tsx` / `AvailabilityCalendar.tsx` | Server Component（`"use client"` なし）。移動・切り替え・クリックは `<Link>` |
| 変更 | `frontend/src/app/(authenticated)/resources/[id]/page.tsx` | `searchParams` から期間を決めてカレンダー用に取得。既存の空き状況リストは残し、カレンダーの下に配置。JSDoc 更新。ページ幅を `max-w-2xl` から `max-w-4xl` に広げた（7 列のグリッドが入るように） |
| 新規 | `frontend/src/app/(authenticated)/reservations/new/prefill.ts` | `startAt`/`endAt` の形式検証 |
| 変更 | 同 `page.tsx`、`ReservationForm.tsx` | 開始・終了日時の初期値を受け取る |
| テスト | `frontend/tests/unit/calendar-utils.test.ts`（43 件）、`availability-calendar.test.tsx`（15 件）、`reservation-prefill.test.ts`（12 件） | |

## 要件との対応

| 要件 | 状況 |
|---|---|
| FR-01 から FR-03、FR-10（週・月・移動） | 実装、テスト済み |
| FR-04、FR-05（期間ごとの取得、ローカル整形） | 実装、テスト済み（`toISOString()` は使っていない） |
| FR-06 から FR-09（予約済み・過去・無効・空き枠） | 実装、テスト済み（境界、優先順位を含む） |
| FR-11（予約フォームの初期値） | 実装、テスト済み |
| FR-12（不正パラメータ） | 実装、テスト済み |
| FR-13（取得失敗） | コンポーネントの表示はテスト済み。`page.tsx` の try/catch は目視未確認 |
| FR-14（既存リストの共存） | 既存のリストのコードは変更していない |

## 検証結果（frontend/）

- `pnpm test`: 14 ファイル、155 件 pass
- `pnpm lint`: エラー・警告なし
- `pnpm format:check`: pass
- `pnpm build`: 成功
- `cd docs-next && npm run build`: 成功（SVG 画像の警告は既存）

## 未実施・既知の制約

- **目視確認（Step 10）は未実施**。この環境では backend と DB が起動しておらず、ブラウザサインインもローカルでは動作しないため、dev ログインで画面を確認できていない。実機での確認項目は Build and Test に記載する
- 既存の空き状況リストは UTC で `from`/`to` を作る（範囲外のため変更していない）。実行環境が UTC のため、日本時間の早朝・深夜に範囲が 9 時間ずれる
- 空き状況は週表示・月表示で別々に 1 回、リスト用に 1 回の計 2 回 API を呼ぶ
- 営業時間（8:00〜20:00）の外の予約は週表示の枠に出ない（月表示の件数には含まれる）
