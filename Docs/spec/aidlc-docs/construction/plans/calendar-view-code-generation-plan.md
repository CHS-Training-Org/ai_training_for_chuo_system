# Code Generation Plan: calendar-view

> この計画が Code Generation の唯一の実行順序（Single Source of Truth）。承認後は計画どおりに進め、完了したステップを `[x]` にする。

## Unit Context

- **Unit**: `calendar-view`（単一ユニット、frontend のみ、Issue #27）
- **Stories**: User Stories はスキップ。代わりに `requirements.md` の FR-01 から FR-14 と受入条件 6 項目に対応づける
- **Dependencies**: 他ユニットなし。Backend の既存 API `GET /api/resources/{id}/availability`（`getAvailabilityAction`）のみに依存する
- **Expected Contract**:
  - 入力：`/resources/{id}?view=week|month&date=YYYY-MM-DD`
  - 出力（遷移先）：`/reservations/new?resourceId={id}&startAt=YYYY-MM-DDTHH:mm&endAt=YYYY-MM-DDTHH:mm`
- **Database Entities**: なし
- **Code Location**: ワークスペース直下の既存構成（`frontend/src/...`）。既存ファイルはその場で修正し、複製は作らない
- **Backend**: 変更しない。最後に `git diff --stat -- backend` が空であることを確認する

## 設計方針（本計画で確定する実装の形）

1. **日時は「壁時計文字列」で扱う**。`YYYY-MM-DDTHH:mm:ss`（バックエンドの `startAt`/`endAt` と同じ形式）の文字列を基本の型とし、比較は文字列の辞書順で行う（同じ形式なので時系列順と一致する）。`Date` のローカルタイムゾーンに依存しないため、実行環境が UTC でも結果が変わらない（Q10）。日付の加算が必要な箇所だけ、`Date.UTC` で組み立てて `getUTC*` で読む。
2. **現在時刻だけは Asia/Tokyo で取る**。`Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", … })` で壁時計文字列にする。関数は `now` を引数で受け取れるようにし、テストでは固定値を渡す。
3. **サーバ・クライアントの分担**：カレンダーは全て Server Component（`"use client"` なし）。移動・切り替え・枠のクリックは `<Link>`。
4. **押せない枠は `<div aria-disabled="true">`、空き枠は `<Link>`**。状態（`available`、`booked`、`past`、`inactive`）を `data-state` 属性にも持たせ、テストと目視確認の手がかりにする。優先順位は `booked`（予約済み）が最優先で、次に `inactive`、`past`、`available` の順。色だけに頼らず、予約済みは「予約済み」の文字、それ以外の押せない枠は薄いグレーと `aria-label` で示す。
5. **既存の空き状況リストは変更しない**（FR-14）。`page.tsx` では位置をカレンダーの下に移すだけにする。
6. **新しい依存は追加しない**。

## Steps

### Part A: 仕様（Spec-first）

- [x] **Step 1**: `/update-spec` を起動し、次を更新する（要件の FR-01 から FR-12 の画面仕様）
  - `docs-next/docs/spec/screen-spec.md` §`/resources/{id}`：カレンダーの UI 要素（週表示の時間グリッド 8-20 時・1 時間枠、月表示の日セルと件数、ツールバー、枠の 4 状態、クリック動作、`view`/`date` パラメータとフォールバック、既存リストの共存）
  - 同 §`/reservations/new`：`startAt`/`endAt` のクエリパラメータ（形式 `YYYY-MM-DDTHH:mm`、不正値は無視）
  - `docs-next/docs/spec/requirements.md`：カレンダービューの要件の追記が必要かを `/update-spec` で判断する
  - `api-spec.md`、`er-diagram.md` は変更しない
  - 文章は `docs-next/CLAUDE.md` の規範と OKF frontmatter に従い、`cd docs-next && npm run build` でリンク・アンカーの破損がないことを確認する

### Part B: 日付ロジック（純関数、テスト先行）

- [x] **Step 2**（テストを先に書く）：`frontend/tests/unit/calendar-utils.test.ts` を作成（FR-03、FR-05、FR-06、FR-08、FR-12）
  - 期間算出：週（月曜始まり、日曜日・月曜日が基準日の場合）、月（月末・月初、2 月、12 月から 1 月、前後月の日を含むグリッド）
  - 整形：`from`/`to` が `YYYY-MM-DDTHH:mm:ss` で、`toISOString()` を使っていないこと
  - 占有判定：重なる、重ならない、境界ちょうど（10:00 終了と 10:00 開始）、複数枠をまたぐ、日をまたぐ、小数秒つきの値
  - 枠の状態：優先順位（予約済み、無効、過去、空き）と、現在時刻ちょうどの枠
  - 現在時刻：UTC の 2026-10-15T20:00:00Z が Asia/Tokyo の 2026-10-16T05:00:00 になること
  - 検証：不正な `view`/`date`（存在しない日付、形式違い、配列）が既定値にフォールバックすること
  - 予約フォームへのリンク生成：`startAt`、`endAt = startAt + 1 時間`（23 時台は対象外のため日またぎは起きない）
- [x] **Step 3**（実装）：`frontend/src/app/(authenticated)/resources/[id]/availability/calendar-utils.ts` を作成し、Step 2 のテストを pass させる
  - 公開する関数（案）：`parseCalendarParams`、`getWeekRange`、`getMonthGrid`、`toWallClock`、`nowInTokyo`、`isOccupied`、`getSlotState`、`buildReservationHref`、`shiftDate`（前へ・次への基準日）
  - 定数：`DAY_START_HOUR = 8`、`DAY_END_HOUR = 20`、`SLOT_MINUTES = 60`（要件の Q1、Q2）

### Part C: 表示部品

- [x] **Step 4**（テストを先に書く）：`frontend/tests/unit/availability-calendar.test.tsx` を作成（`@testing-library/react`）（FR-01、FR-06 から FR-10）
  - `WeekGrid`：12 行 × 7 列、予約済みの枠は `data-state="booked"` で `<a>` ではない、過去は `past`、無効なリソースは全枠が押せない、空き枠の `href` が `/reservations/new?resourceId=…&startAt=…&endAt=…`
  - `CalendarToolbar`：前へ・次へ・今日・週/月切替のリンク先が期待する `view`/`date`
  - `MonthGrid`：日ごとの件数（`reservationId` の重複なし）、セルのリンク先が `view=week&date=その日`
- [x] **Step 5**（実装）：`frontend/src/app/(authenticated)/resources/[id]/availability/` に作成し、Step 4 のテストを pass させる
  - `CalendarToolbar.tsx`、`WeekGrid.tsx`、`MonthGrid.tsx`、`AvailabilityCalendar.tsx`（`view` による振り分け）
  - shadcn/ui の既存部品（`Button`、`Card` 等）と Tailwind を使う。必要なら `cn` ユーティリティの既存実装を再利用する

### Part D: ページへの組み込みと予約フォーム

- [x] **Step 6**：`frontend/src/app/(authenticated)/resources/[id]/page.tsx` を修正（FR-02、FR-04、FR-12 から FR-14）
  - `searchParams`（Promise）を受け取り、`parseCalendarParams` で `view`/`date` を検証
  - 期間に応じた `from`/`to` で `getAvailabilityAction` を呼ぶ（カレンダー用。失敗してもページは表示し、カレンダー領域に取得失敗のメッセージ）
  - 既存の空き状況リスト用の取得とコードは変更せず、カレンダーの下に置く
  - ページの JSDoc を更新（「カテゴリ 5 で実装予定」の記述など、実態とずれた箇所を直す）
- [x] **Step 7**（テストを先に書く）：`frontend/tests/unit/reservation-prefill.test.ts` を作成（FR-11）
  - `YYYY-MM-DDTHH:mm` は受け入れる。秒つき、空文字、配列、存在しない日時、`undefined` は無視（空文字を返す）
- [x] **Step 8**（実装）：`frontend/src/app/(authenticated)/reservations/new/` を修正し、Step 7 のテストを pass させる
  - `prefill.ts`（新規）：`parseDateTimeLocalParam`
  - `page.tsx`：`startAt`/`endAt` を読み、`ReservationForm` に `defaultStartAt`/`defaultEndAt` として渡す。JSDoc を更新
  - `ReservationForm.tsx`：`defaultValues` の `startAt`/`endAt` に反映。`resourceId` の既存の挙動は変えない

### Part E: 検証と成果物

- [x] **Step 9**：検証（`frontend/` で実行）
  - `pnpm test`（全体）、`pnpm lint`、`pnpm format`（整形）のあと `pnpm format:check`、`pnpm build`
  - `git diff --stat -- backend` が空であること
  - `getAvailabilityAction` と `AvailabilitySlotSchema` に差分がないこと
- [ ] **Step 10**（未実施：backend・DB が起動しておらず、dev ログインで確認できない。Build and Test に確認手順を記載する）：目視確認（可能な場合。不可能なら Build and Test に記録する）
  - 開発サーバーを起動し、dev 専用ログインボタン（`src/server/actions/dev-auth.ts`）でログインする
  - 有効なリソースで、週表示、月表示、前へ・次へ・今日、空き枠から予約フォームへ遷移（開始・終了日時が入ること）、予約済みと過去の枠が押せないことを確認する
  - 無効なリソースで全枠が押せないことを確認する
  - 実行環境が UTC のため、現在時刻の判定が Asia/Tokyo で正しいことも確認する
- [x] **Step 11**：`Docs/spec/aidlc-docs/construction/calendar-view/code/summary.md` を作成（変更・新規ファイルの一覧、要件との対応、テスト結果、既知の制約）

## Story / Requirement Traceability

| 要件 | 対応ステップ |
|---|---|
| FR-01（週グリッド 8-20 時） | Step 2、3、4、5 |
| FR-02（週・月切替） | Step 4、5、6 |
| FR-03（期間移動） | Step 2、3、4、5 |
| FR-04（期間ごとの取得） | Step 3、6 |
| FR-05（ローカル整形） | Step 2、3 |
| FR-06（予約済みグレーアウト） | Step 2、3、4、5 |
| FR-07（空き枠から予約フォーム） | Step 2、3、4、5、7、8 |
| FR-08（過去の枠） | Step 2、3、4、5 |
| FR-09（非アクティブ） | Step 4、5 |
| FR-10（月表示） | Step 4、5 |
| FR-11（予約フォームの初期値） | Step 7、8 |
| FR-12（不正パラメータ） | Step 2、3、6 |
| FR-13（取得失敗） | Step 6、10 |
| FR-14（既存リストの共存） | Step 6 |
| 受入条件「Backend 変更不要」 | Step 9 |

## MVP の区切り

Step 1 から Step 8 のうち、`MonthGrid` と月表示の部分（Step 4、5 の月関連）を後回しにした時点が MVP（週表示、移動、グレーアウト、予約フォームへの遷移）。月表示まで含めて受入条件を満たす。

## リスクと注意

- **ファイル配置の競合**：`resources/[id]/page.tsx` は他の課題（`resource-detail-info`、`resource-image-upload`）と共有する。カレンダーの実装は `availability/` に閉じ、`page.tsx` への変更を最小にする。
- **日付の落とし穴**：Step 2 のテストで、月またぎ、境界、UTC 実行環境を先に固定する。実装中にテストを弱めて通さない。
- **日時の初期値**：`datetime-local` は秒を含まない形式（`YYYY-MM-DDTHH:mm`）のみ受け入れる。カレンダーが作るリンクもこの形式にする。
- **既存コードの気付き**：既存の空き状況リストは UTC で `from`/`to` を作っている（範囲外のため修正しない。summary に記録する）。
