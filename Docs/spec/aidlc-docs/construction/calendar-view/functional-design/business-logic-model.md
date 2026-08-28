---
type: note
title: Business Logic Model
description: カレンダービュー（Unit：calendar-view）の業務ロジック設計（表示期間算出・グリッド写像・遷移URL生成）
tags:
  - ai-dlc
  - functional-design
  - business-logic
timestamp: 2026-08-20
---

# Business Logic Model — カレンダービュー（Unit: calendar-view）

## 1. 表示期間算出ロジック

カレンダーの状態は「表示モード（`week` | `month`）」と「アンカー日付（表示中の期間に含まれる代表日、初期値は本日）」の2値で表現する。`from`/`to`（`GET /api/resources/{id}/availability`への引数）はこの2値から都度導出する。

### 1-1. 週表示の期間算出

- アンカー日付を含む週の月曜日を`weekStart`とする（曜日番号は`Date.getDay()`が返す0=日曜〜6=土曜を月曜起点に変換：`(day + 6) % 7`日分をアンカー日付から引く）。
- `from = weekStart の 00:00:00`、`to = weekStart + 7日 の 00:00:00`（半開区間、翌週月曜の0時を含まない上限として使う）。

### 1-2. 月表示の期間算出

- アンカー日付の年月から、その月の1日を`monthStart`とする。
- `from = monthStart の 00:00:00`、`to = 翌月1日 の 00:00:00`（月表示でも空き状況取得はその月1回分のみで、`getAvailabilityAction`の呼び出し回数はRSV-04の要件どおり期間ナビゲーション1回につき1回を維持する）。

### 1-3. 期間の前後移動

- 週表示で「次週」：アンカー日付に7日加算。「前週」：7日減算。
- 月表示で「次月」：アンカー日付を「その月の1日」に正規化してから1か月加算（`setMonth(getMonth() + 1)`）。「前月」も同様に1日正規化してから1か月減算する。
  - 正規化が必要な理由：アンカー日付が31日のまま月加算すると、日数の少ない月（2月等）でJavaScriptの`Date`が翌月にロールオーバーし、意図しない月がスキップされるため。
- 表示モードを切り替えたとき（週→月、月→週）は、アンカー日付は変更しない（直前に見ていた期間を含む月・週がそのまま表示される。STORY-02 AC2に対応）。

## 2. 週表示：スロット→1時間グリッド写像ロジック

週表示は7日 × 24時間 = 168個の1時間セルからなるグリッドとして描画する。

各セル`(day, hour)`について：

- `cellStart = weekStart + day日 + hour時間`
- `cellEnd = cellStart + 1時間`
- `occupied = occupiedSlots.some(slot => slot.startAt < cellEnd && slot.endAt > cellStart)`

この重複判定式（`existingStart < to && existingEnd > from`）は、バックエンドの`ResourceService.overlaps`（半開区間`[start, end)`）と同一の定義を用いる。これによりSTORY-04 AC4（14:30〜15:30の予約が14-15時・15-16時の両セルを予約済み扱いにする）を満たす：14:30は15:00より前かつ15:30は14:00より後（14-15セルと重複）、14:30は16:00より前かつ15:30は15:00より後（15-16セルと重複）と判定される。

セルが`occupied`のとき、そのセルと重複する`OccupiedSlot`のうち最初の1件の`reservationId`をセルに紐づけておく（表示上は個々の予約IDを使わないが、将来のツールチップ表示等の拡張点として`HourSlotStatus`に保持する）。

## 3. 月表示：日単位要約ロジック

月表示は「月曜始まりの完全な週」を並べたグリッドとして描画する。表示対象月の1日を含む週の月曜日から、末日を含む週の日曜日までを描画範囲とする（前月・翌月の日付を含む場合がある）。

各日`date`について：

- `dayStart = date の 00:00:00`、`dayEnd = dayStart + 1日`
- `reservationCount = occupiedSlots.filter(slot => slot.startAt < dayEnd && slot.endAt > dayStart).length`（半開区間重複、2.と同じ判定式を日単位に適用）
- `isCurrentMonth = date.getMonth() === 表示対象月`（前月・翌月の日付かどうかの判定。前月・翌月の日付も`reservationCount`は同様に算出するが、表示上は薄いスタイルにする）

日セルの表示：`reservationCount === 0`なら空き扱い（背景を空きスタイル）、`reservationCount > 0`ならグレーアウトし件数を表示する。日セルをクリックすると、アンカー日付をその日付に設定し表示モードを`week`に切り替える（月表示の日セル自体は`/reservations/new`への遷移を行わない。RSV-08）。

## 4. 空き枠クリック時の遷移URL生成ロジック（週表示のみ）

週表示のセル`(day, hour)`について：

- `startAt`文字列を`` `${YYYY}-${MM}-${DD}T${HH}:00` ``の形式（秒なし、ローカル時刻）で組み立てる。年月日・時はゼロ埋め2桁とする。
- この形式は`ReservationForm.tsx`の`<Input type="datetime-local">`がフォーム表示・編集する値の形式（`YYYY-MM-DDTHH:mm`）と一致させる。
- 遷移先URLは`` `/reservations/new?resourceId=${resourceId}&startAt=${startAt}` ``。

セルのクリック可否は、この生成ロジックとは別に、次のクリック可否決定ロジックが一元的に判定する：`cell.occupied === true`のとき`null`を返し（STORY-04 AC3。占有中はURLを生成しない）、そうでなければ上記のURLを返す。過去日時のセルも占有中でなければ通常どおりURLを返す（本課題側での無効化は行わない）。この判定を専用の関数（クリック可否とURL生成を1回の呼び出しで返す）に一元化するのは、コンポーネント側の条件分岐にクリック可否の判断を委ねず、ユニットテストで直接検証できるようにするためである。

## 5. `ReservationForm.tsx`の`startAt`初期値設定ロジック

- `/reservations/new/page.tsx`は`searchParams`から`startAt`を読み取り、`ReservationForm`に`defaultStartAt`propとして渡す（既存の`defaultResourceId`と同じ扱い）。
- `ReservationForm`の`useForm`の`defaultValues.startAt`を`defaultStartAt ?? ""`に変更する（既存の`defaultResourceId ?? ""`と同一パターン）。
- `startAt`クエリパラメータの値検証（形式不正時のフォールバック）は行わない。既存の`CreateReservationSchema`（`z.string().min(1, ...)`）とフォーム側の`<input type="datetime-local">`が不正な形式を自然に無視する（ブラウザが解釈できない値は空表示になる）ため、追加のバリデーションロジックは不要と判断する。
