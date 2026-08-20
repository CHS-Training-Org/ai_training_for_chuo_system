---
type: note
title: Functional Design Plan
description: Issue #27（カレンダービュー）のFunctional Designステージ計画（Unit：calendar-view）
tags:
  - ai-dlc
  - functional-design
  - plan
timestamp: 2026-08-20
---

# Functional Design Plan — カレンダービュー（Unit: calendar-view）

## 実行チェックリスト

- [x] Step 1: ユニットコンテキストの確認（Application DesignはSKIP済みのため、`requirements.md`・`stories.md`・既存コード〈`resources/[id]/page.tsx`・`server/actions/resources.ts`・`reservations/new/ReservationForm.tsx`・`ResourceService.overlaps`〉を直接入力とした）
- [x] Step 2: 本計画書の作成
- [x] Step 3: クラリファイング質問の生成・提示（`AskUserQuestion`で4問）
- [x] Step 4: 回答の収集・分析（曖昧語・矛盾なし。回答内容は下記「確定事項」参照）
- [x] Step 5: 成果物生成（`business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`）
- [x] Step 6: 完了メッセージ提示・承認待ち

## クラリファイング質問と回答（確定事項）

Functional Design着手前の既存コード再検証で、`ReservationForm.tsx`が`startAt`クエリパラメータを解釈しない実装であることが判明したため、当初の`requirements.md`・`execution-plan.md`の前提と矛盾する点を含めて4問を確認した（詳細は`Docs/spec/aidlc-audit.md`「Functional Design — 前提確認」参照）。

| # | 論点 | 決定 |
|---|------|------|
| 1 | 空き枠クリック時のstartAt引き渡し方式 | `ReservationForm.tsx`側も変更する。`/reservations/new`は`resourceId`・`startAt`の両方をクエリパラメータとして受け取り、フォーム初期値に設定する（RSV-09として`requirements.md`に追記済み） |
| 2 | 月表示のセル粒度 | 日単位の要約セル（1日1マス、予約有無を色・件数で要約表示）。1時間刻みグリッドは週表示のみ（RSV-08として`requirements.md`に追記済み） |
| 3 | 既存テキストリストとカレンダー期間の連動要否 | 連動させず、常に当日〜7日後固定のまま表示する（RSV-05を明確化） |
| 4 | 過去日時枠のクリック可否 | クリック可能のまま（本課題側で無効化しない。過去日時の申請可否は既存の予約作成APIのバリデーションに委ねる） |

この決定に伴い、`requirements.md`（RSV-05〜09、NFR、Technical Context）と`execution-plan.md`（Primary Changes、Dependent Components、NFR impact）を修正済み。

## 設計対象の業務ロジック

1. 表示期間算出ロジック（週表示・月表示それぞれの`from`/`to`算出、前後移動時のアンカー日付更新）
2. 週表示のスロット→1時間グリッド写像ロジック（`OccupiedSlot[]`との半開区間重複判定）
3. 月表示の日単位要約ロジック（日ごとの予約件数集計、月グリッドの前月・翌月日付の扱い）
4. 空き枠クリック時の遷移URL生成ロジック（`startAt`のdatetime-local形式整形）
5. `ReservationForm.tsx`の`startAt`初期値設定ロジック
