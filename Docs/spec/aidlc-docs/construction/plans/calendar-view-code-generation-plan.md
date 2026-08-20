---
type: note
title: Code Generation Plan
description: Issue #27（カレンダービュー）のCode Generation実行計画（Unit：calendar-view）
tags:
  - ai-dlc
  - code-generation
  - plan
timestamp: 2026-08-20
---

# Code Generation Plan — カレンダービュー（Unit: calendar-view）

## Unit Context

- **対象ユニット**: `calendar-view`（frontendのみ、単一ユニット）
- **対応ストーリー**: STORY-01（カレンダー形式の空き状況表示）・STORY-02（週/月表示切り替え）・STORY-03（表示期間の前後移動）・STORY-04（空き枠クリックによる予約導線）
- **依存関係**: 既存の`getAvailabilityAction`・`getResourceAction`（`server/actions/resources.ts`、シグネチャ変更なし）。バックエンド・DBの変更なし。
- **入力設計成果物**: `Docs/spec/aidlc-docs/construction/calendar-view/functional-design/`（business-logic-model.md・business-rules.md・domain-entities.md・frontend-components.md）

このプランがCode Generationの実行における唯一の正典であり、各ステップを順に実行する。

## Steps

- [x] **Step 1: Business Logic Generation**
  - 作成: `frontend/src/app/(authenticated)/resources/[id]/calendar-logic.ts`
  - 内容: `business-logic-model.md`の1〜4章を純粋関数として実装する
    - `computePeriod(viewMode, anchorDate): CalendarPeriod`
    - `shiftAnchorDate(viewMode, anchorDate, direction): Date`（月表示は月初正規化、BR-11）
    - `buildWeekSlots(weekStart, occupiedSlots): HourSlotStatus[]`（168セル、BR-03・BR-04）
    - `buildMonthDays(anchorDate, occupiedSlots): DaySummary[]`（月曜始まりの完全な週、前月・翌月日付を含む、BR-06・BR-08）
    - `buildReservationUrl(resourceId, date, hour): string`（BR-14。内部実装として使用し、外部には公開しない）
    - `getWeekCellHref(cell: HourSlotStatus, resourceId): string | null`（`cell.occupied`が`true`の場合は`null`を返し、そうでなければ`buildReservationUrl`の結果を返す。クリック可否の決定をコンポーネント内の条件分岐に委ねず、この関数一つに集約する。STORY-04 AC1・AC3の担保をユニットテストで直接検証可能にするための設計。`CalendarWeekGrid`はこの関数の戻り値が`null`かどうかだけでクリック可否を判定する）
    - `formatPeriodLabel(viewMode, period): string`（トゥールバー表示用ラベル）
  - 対応要件: RSV-04, RSV-06, RSV-07, RSV-08, RSV-09, BR-01〜BR-11, BR-14

- [x] **Step 2: Business Logic Unit Testing**
  - 作成: `frontend/tests/unit/calendar-logic.test.ts`
  - テストケース（最低限）:
    - `computePeriod`: 週表示・月表示それぞれの`from`/`to`算出（月曜始まりの境界値を含む）
    - `shiftAnchorDate`: 週の前後移動、月の前後移動（31日始まりで日数の少ない月へ移動するケースを含む、BR-11）
    - `buildWeekSlots`: 境界一致の予約・境界不一致の予約（14:30〜15:30が14-15時・15-16時の両セルを占有済みにする、STORY-04 AC4/BR-04）・予約なしの空きセル
    - `buildMonthDays`: 当月1日が月曜でない月の前月日付混入、末日を含む週の翌月日付混入、日次予約件数の集計
    - `buildReservationUrl`: ゼロ埋め・`YYYY-MM-DDTHH:mm`形式の検証
    - `getWeekCellHref`: 空きセル→`buildReservationUrl`と同じURLを返す（STORY-04 AC1）、占有セル→`null`を返す（STORY-04 AC3）、境界不一致で占有扱いになったセル→`null`を返す（STORY-04 AC3・AC4の組み合わせ）、過去日時の空きセル→`null`を返さない（クリック可能のまま、Functional Design時の確認事項）
  - 対応要件: すべてのstory受け入れ基準の裏付け

- [x] **Step 3: Business Logic Summary**
  - `Docs/spec/aidlc-docs/construction/calendar-view/code/business-logic-summary.md`に、実装した関数一覧とテストケース対応表を記録する

- [x] **Step 4: Frontend Components Generation**
  - 作成: `frontend/src/app/(authenticated)/resources/[id]/CalendarToolbar.tsx`
  - 作成: `frontend/src/app/(authenticated)/resources/[id]/CalendarWeekGrid.tsx`
  - 作成: `frontend/src/app/(authenticated)/resources/[id]/CalendarMonthGrid.tsx`
  - 作成: `frontend/src/app/(authenticated)/resources/[id]/ResourceAvailabilityCalendar.tsx`
  - 変更: `frontend/src/app/(authenticated)/resources/[id]/page.tsx`（`ResourceAvailabilityCalendar`を追加、既存リストは変更しない）
  - 変更: `frontend/src/app/(authenticated)/reservations/new/page.tsx`（`searchParams.startAt`を読み取り`ReservationForm`へ渡す）
  - 変更: `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx`（`defaultStartAt` prop追加）
  - `CalendarWeekGrid`のセルは`getWeekCellHref(cell, resourceId)`の戻り値で分岐する（`null`ならグレーアウト・クリック無効の`<div>`、`null`でなければクリック可能な`<Link>`）。コンポーネント自身は占有判定を行わない
  - `data-testid`命名: `calendar-view-mode-week`・`calendar-view-mode-month`・`calendar-prev-button`・`calendar-next-button`・`calendar-week-cell-{day}-{hour}`・`calendar-month-day-{date}`
  - 対応要件: RSV-01〜03, RSV-05, RSV-09, STORY-01〜04

- [x] **Step 5: Frontend Components Unit Testing**
  - `frontend/tests/unit/resources/page.test.tsx`は存在しないため影響確認はスキップ（`resources/[id]/page.tsx`に対する既存のレンダリングテスト自体がリポジトリに存在しない）
  - 作成: `frontend/tests/unit/reservation-form.test.tsx`（`defaultStartAt`が開始日時欄の初期値に反映されること・未指定時は空のままであることの2件を検証）
  - 対応要件: RSV-09, STORY-04 AC1

- [x] **Step 6: Frontend Components Summary**
  - `Docs/spec/aidlc-docs/construction/calendar-view/code/frontend-components-summary.md`に、作成・変更ファイル一覧とテスト結果を記録する

- [x] **Step 7: Documentation Generation**
  - `Docs/spec/aidlc-docs/construction/calendar-view/code/summary.md`を生成し、Build and Test後の`/update-spec`反映対象（`screen-spec.md` §`/resources/{id}`・§`/reservations/new`）を明記する

## Skip対象（理由明記）

- **Repository Layer / API Layer Generation**: SKIP（バックエンド変更なし。既存の`GET /api/resources/{id}/availability`をそのまま利用）
- **Database Migration Scripts**: SKIP（データモデル変更なし）
- **Deployment Artifacts Generation**: SKIP（インフラ・デプロイモデルの変更なし、Workflow PlanningでInfrastructure Design自体をSKIP済み）
