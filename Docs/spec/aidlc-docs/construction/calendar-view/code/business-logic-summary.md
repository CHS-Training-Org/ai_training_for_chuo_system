---
type: note
title: Business Logic Summary
description: カレンダービュー（Unit：calendar-view）のビジネスロジック実装サマリー（Code Generation Step 1〜3）
tags:
  - ai-dlc
  - code-generation
  - summary
timestamp: 2026-08-20
---

# Business Logic Summary — カレンダービュー（Unit: calendar-view）

## 作成ファイル

- `frontend/src/app/(authenticated)/resources/[id]/calendar-logic.ts`（純粋関数、コンポーネントに依存しない）
- `frontend/tests/unit/calendar-logic.test.ts`（22テストケース、`pnpm test calendar-logic`で全件成功）

## 実装した関数

| 関数 | 役割 | 対応するビジネスルール |
|---|---|---|
| `computePeriod(viewMode, anchorDate)` | 表示期間`{ from, to }`の算出 | BR-01, BR-02, BR-06 |
| `shiftAnchorDate(viewMode, anchorDate, direction)` | 期間の前後移動（月表示は月初正規化） | BR-10, BR-11 |
| `formatPeriodLabel(viewMode, period)` | トゥールバー表示用ラベル | — |
| `buildWeekSlots(weekStart, occupiedSlots)` | 週表示の168セルへの写像 | BR-03, BR-04 |
| `buildMonthDays(anchorDate, occupiedSlots)` | 月表示の日次要約（前月・翌月日付含む） | BR-06, BR-08 |
| `getWeekCellHref(cell, resourceId)` | クリック可否の一元判定＋遷移URL生成 | BR-05, BR-14, BR-15 |

## テストケース対応表

| テストケース | 検証内容 | 対応する受け入れ基準 |
|---|---|---|
| `computePeriod` 週/月各種 | 週開始の境界値（月曜・日曜アンカー）、月の年またぎ | STORY-01 AC1, RSV-06 |
| `shiftAnchorDate` 月表示の月またぎ | 1月31日始まりで2月へ進めても3月へロールオーバーしないこと | BR-11 |
| `buildWeekSlots` 境界一致・境界不一致 | 14:30〜15:30の予約が14-15時・15-16時の両セルを占有済みにする | STORY-04 AC4 |
| `buildMonthDays` 前月・翌月混入、件数集計 | 月グリッドの構成、日次予約件数 | STORY-02 AC1 |
| `getWeekCellHref` 空き/占有/境界不一致/過去日時 | クリック可否の分岐（STORY-04 AC1・AC3） | STORY-04 AC1, AC3 |

## 未実施・後続ステップ

- コンポーネント（`ResourceAvailabilityCalendar`等）の生成はStep 4で実施する。
- 予約済みセルの視覚的区別（色・パターン・テキスト、BR-12）はコンポーネントの描画詳細であり、本ステップの純粋関数では扱わない。
