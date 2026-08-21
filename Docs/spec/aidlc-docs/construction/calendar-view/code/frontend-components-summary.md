---
type: note
title: Frontend Components Summary
description: カレンダービュー（Unit：calendar-view）のフロントエンドコンポーネント実装サマリー（Code Generation Step 4〜6）
tags:
  - ai-dlc
  - code-generation
  - summary
timestamp: 2026-08-20
---

# Frontend Components Summary — カレンダービュー（Unit: calendar-view）

## 作成ファイル

- `frontend/src/app/(authenticated)/resources/[id]/CalendarToolbar.tsx`
- `frontend/src/app/(authenticated)/resources/[id]/CalendarWeekGrid.tsx`
- `frontend/src/app/(authenticated)/resources/[id]/CalendarMonthGrid.tsx`
- `frontend/src/app/(authenticated)/resources/[id]/ResourceAvailabilityCalendar.tsx`
- `frontend/tests/unit/reservation-form.test.tsx`

## 変更ファイル

- `frontend/src/app/(authenticated)/resources/[id]/page.tsx`：`ResourceAvailabilityCalendar`を追加（既存のテキストリストの上、コンテナ幅を`max-w-2xl`→`max-w-4xl`に拡大）
- `frontend/src/app/(authenticated)/reservations/new/page.tsx`：`searchParams.startAt`を読み取り`ReservationForm`へ`defaultStartAt`として渡す
- `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx`：`defaultStartAt` propを追加し、`useForm`の`defaultValues.startAt`に反映

## テスト結果

- `pnpm test`：全13ファイル・113件成功（既存111件＋新規`calendar-logic.test.ts`22件のうち一部再掲・`reservation-form.test.tsx`2件を含む）
- `pnpm lint`（oxlint）：エラー・警告なし
- `pnpm build`（型チェック兼ねる）：成功

## 実装上の注記

- `ReservationForm`のレンダリングテストは、`createReservationAction`が`@/lib/session`経由でBetter Auth（Cognito）設定を読み込み、テスト環境でエラーになるためモック化した（`resources.test.ts`等の既存Server Actionテストと同じ回避パターン）。
- `CalendarWeekGrid`のクリック可否判定は`calendar-logic.ts`の`getWeekCellHref`に一元化しており、コンポーネント自体はクリック挙動をテスト対象にしていない（`business-logic-summary.md`のテストケース対応表を参照）。
- `resources/[id]/page.tsx`・`reservations/new/page.tsx`（Server Component）自体のレンダリングテストはリポジトリに前例がなく、本課題でも追加していない。カレンダーとテキストリストの共存（STORY-01 AC3）・予約済み枠の視覚的区別（BR-12）は、Build and Test段階での実機・ブラウザ確認に委ねる。
