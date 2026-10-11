# Business Logic Model — calendar-view

## データフロー概要

```text
[AvailabilityCalendar（Client Component）]
  state: mode（"week" | "month"）, anchorDate（Date）
    │
    ├─ anchorDate・mode から from/to（LocalDateTime文字列）を算出
    │     ↓
    ├─ getAvailabilityAction(resourceId, from, to) を呼び出し（既存BFF関数、変更なし）
    │     ↓ AvailabilitySlot[]（占有スロット一覧）
    │
    ├─ mode に応じてグリッドセルを生成し、各セルに占有判定を適用
    │     week: 7日 × 12時間（8-20時）の84セル
    │     month: 当月の日数分のセル（最大31）＋前後月の空白セル（非活性）
    │     ↓
    ├─ 各セルを描画（空き＝クリック可能、予約済み＝グレーアウト）
    │
    └─ セルクリック時：開始日時文字列を組み立て、
          `/reservations/new?resourceId={id}&startAt={value}` へ遷移
```

## ロジック1：表示期間（from/to）の算出

**入力**: `anchorDate`（表示中の基準日）、`mode`（`"week"` | `"month"`）
**出力**: `from`・`to`（`LocalDateTime` 形式の文字列、秒まで・オフセットなし。既存の `toISOString().slice(0, 19)` パターンを踏襲）

- **週表示**:
  - `weekStart` = `anchorDate` を含む週の月曜日 00:00:00（`anchorDate.getDay()` を月曜始まりのオフセットに変換して算出。日曜日は `getDay() === 0` なので「6日前」扱いにする）
  - `from` = `weekStart`、`to` = `weekStart + 7日`（半開区間 `[from, to)`。境界日の予約も正しく含められる）
- **月表示**:
  - `monthStart` = `anchorDate` の月の1日 00:00:00
  - `from` = `monthStart`、`to` = 翌月の1日 00:00:00

**期間移動（前週/次週・前月/次月）**: `anchorDate` を週表示なら ±7日、月表示なら ±1か月した日付に更新し、上記の算出を再実行する（モード切替時も同様に再計算し、`getAvailabilityAction` を再呼び出しする）。

## ロジック2：グリッドセルの生成

- **週表示**: 7列（月〜日） × 12行（8時〜19時、各セルは1時間幅）＝84セル。各セルは `{ date: Date, hour: number }` を持つ
- **月表示**: 当月の日数分のセル（`{ date: Date }`）。カレンダーの行列を揃えるため、月初の曜日に応じた前月末尾の空白セル・月末の曜日に応じた翌月先頭の空白セルを補う。空白セルは表示のみでクリック不可（当月データしか取得していないため）

## ロジック3：セルの占有判定

既存バックエンド（`ResourceService#availability`）の重複判定と同じ**半開区間の重なり判定**を踏襲する：`overlap(aStart, aEnd, bStart, bEnd) = aStart < bEnd && bStart < aEnd`（隣接区間は重ならない扱い）。

- **週表示のセル**（`{ date, hour }`）:
  - セル区間 = `[date 00:00 + hour時間, date 00:00 + (hour+1)時間)`
  - 取得した `AvailabilitySlot[]` のいずれかとセル区間が重なれば「予約済み」、重ならなければ「空き」
- **月表示のセル**（`{ date }`）:
  - 当日の営業時間区間 = `[date 08:00, date 20:00)`
  - 当日に重なる占有スロットをすべて集め、その合計がこの営業時間区間を完全に覆っている場合のみ「予約済み」（グレーアウト・クリック不可）とする。1分でも空きがあれば「空き」（クリック可能）として扱う
  - **判定方法**: 当日に重なる占有スロットを開始時刻順に並べ、区間 `[08:00, 20:00)` が隙間なく埋まっているかを走査する（区間マージによる被覆判定）

## ロジック4：クリック時の開始日時組み立て

- **週表示のセルクリック**（`{ date, hour }`）: `startAt` = `date` の年月日 + `hour:00`（`YYYY-MM-DDTHH:mm` 形式、`datetime-local` 入力欄がそのまま受け付ける形式）
- **月表示のセルクリック**（`{ date }`）: `startAt` = `date` の年月日 + `09:00`（既定時刻）
- 組み立てた `startAt` を `/reservations/new?resourceId={resourceId}&startAt={startAt}` のクエリパラメータとして遷移する
