# Code Generation Summary — calendar-view

## 変更ファイル一覧

### 新規作成

- `frontend/src/lib/calendar/period.ts`
- `frontend/src/lib/calendar/availability-to-events.ts`
- `frontend/src/components/resources/resource-availability-calendar.tsx`
- `frontend/tests/unit/lib/calendar/period.test.ts`
- `frontend/tests/unit/lib/calendar/availability-to-events.test.ts`

### 変更

- `frontend/src/app/(authenticated)/resources/[id]/page.tsx`
- `frontend/src/app/(authenticated)/reservations/new/page.tsx`
- `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx`
- `frontend/src/app/globals.css`
- `frontend/package.json` / `frontend/pnpm-lock.yaml`

### Spec（`/update-spec` で Code Generation 前に統合済み）

- `docs-next/docs/spec/requirements.md`（UC-02 に RES-09〜12 を追加）
- `docs-next/docs/spec/screen-spec.md`（`/resources/{id}`・`/reservations/new` を更新）

## 新規依存関係

- `react-big-calendar@^1.20.0`（MIT）
- `date-fns@^4.4.0`（MIT）
- `@types/react-big-calendar@^1.16.3`（devDependency）

## ストーリートレーサビリティ

| ストーリー | 実装箇所 | 状態 |
|---|---|---|
| US-01（カレンダー表示・既存リストとの共存） | `resource-availability-calendar.tsx`・`resources/[id]/page.tsx` | ✅ |
| US-02（週/月表示切替） | `resource-availability-calendar.tsx`（`onView`） | ✅ |
| US-03（週表示での空き枠クリック→予約フォーム遷移） | `resource-availability-calendar.tsx`（`handleSelectSlot`）・`reservations/new` 側の `startAt` 対応 | ✅ |
| US-04（月表示の日セルクリック→週表示切替） | `resource-availability-calendar.tsx`（`handleSelectSlot`） | ✅ |
| US-05（期間移動と再取得） | `resource-availability-calendar.tsx`（`handleNavigate`）・`period.ts` | ✅ |

## 検証結果（本ユニットの Code Generation 時点）

- `pnpm test`：99/99 成功
- `pnpm lint`：エラーなし
- `pnpm format:check`：フォーマット済み
- `npx tsc --noEmit`：型エラーなし
- `cd docs-next && npm run build`：spec 更新時にリンク・アンカー破損なしを確認済み

バックエンド・データベースの変更なし（NFR Requirements/Design・Infrastructure Design は Workflow Planning で SKIP 判定済み）。詳細な Build and Test（Playwright E2E を含む）は次ステージで実施する。
