# Frontend Components — calendar-view

## コンポーネント構成

```text
resources/[id]/page.tsx（Server Component、改修）
  └─ AvailabilityCalendar（新規、Client Component）
       ├─ CalendarModeToggle（週表示/月表示切り替え。同一ファイル内の小コンポーネントで可）
       ├─ CalendarNav（前週/次週・前月/次月の移動ボタン）
       ├─ WeekGrid（週表示グリッド。mode==="week" のとき描画）
       └─ MonthGrid（月表示グリッド。mode==="month" のとき描画）
```

単一画面専用の機能であり、内部の小コンポーネント（`CalendarModeToggle` 等）を別ファイルに分割する必要はない。`AvailabilityCalendar.tsx` 1ファイルに収める。

## `resources/[id]/page.tsx`（改修）

- 既存の「空き状況」セクション（`<ul>` によるスロット一覧、L98-129 相当）を削除し、代わりに `<AvailabilityCalendar resourceId={resource.id} isActive={resource.isActive} />` を描画する
- 初期表示時の `getAvailabilityAction` 呼び出し（Server Component側での初回フェッチ）は撤去する。初回データ取得は `AvailabilityCalendar` がマウント時に自ら行う（週/月の切り替えと同じ経路に統一するため、初回だけ特別扱いしない）

## `AvailabilityCalendar.tsx`（新規、`"use client"`）

### Props

```ts
interface AvailabilityCalendarProps {
  resourceId: string;
  isActive: boolean;
}
```

### State

```ts
const [mode, setMode] = useState<"week" | "month">("week");
const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

状態は `useState` で管理し、`zustand` は使わない（この画面内に閉じたローカル状態であり、他画面と共有する必要がないため）。

### 主な振る舞い

- `mode` または `anchorDate` が変わるたびに `useEffect` で `getAvailabilityAction` を呼び出し、`slots` を更新する
- 取得失敗時は `error` にメッセージをセットし、直前の `slots` は保持する（期間移動のたびに空扱いへ巻き戻すと、実際には空いていない枠が一時的に空きとして見えてしまうため）
- モード切り替え・期間移動ボタンは `isLoading` 中は無効化する（二重リクエスト防止）
- セルクリック時：
  - `isActive === false` の場合は何もしない（BR-08）
  - セルの占有判定が `"occupied"` の場合は何もしない（クリック不可の見た目と一致させる）
  - `"available"` の場合、`business-logic-model.md` ロジック4のとおり `startAt` を組み立て、`router.push(`/reservations/new?resourceId=${resourceId}&startAt=${startAt}`)` で遷移する

### ユーザー操作フロー

1. 画面を開く → 今週（月曜始まり）の週表示が初期表示される
2. 「月表示」に切り替える → 当月のグリッドが表示される（`getAvailabilityAction` 再取得）
3. 「次月」を押す → 翌月のグリッドが表示される（再取得）
4. 空いている日のセルをクリックする → `/reservations/new?resourceId=...&startAt=...` へ遷移する

## `reservations/new/page.tsx`（改修）

- `searchParams` から新たに `startAt` を読み取り、`defaultStartAt` として `ReservationForm` に渡す（既存の `defaultResourceId` と同じ扱い）

## `ReservationForm.tsx`（改修）

- props に `defaultStartAt?: string` を追加し、`開始日時` の `<Input type="datetime-local">` の初期値として反映する（現状は常に空文字列になっている箇所を `defaultStartAt ?? ""` に変更する）
