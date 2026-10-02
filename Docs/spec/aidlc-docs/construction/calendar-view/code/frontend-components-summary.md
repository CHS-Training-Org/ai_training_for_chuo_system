# Frontend Components Summary — calendar-view

## 新規作成

| ファイル | 内容 |
|---|---|
| `frontend/src/components/resources/resource-availability-calendar.tsx` | `ResourceAvailabilityCalendar`（Client Component）。react-big-calendar をラップし、週/月表示切替・期間移動・空き枠/日セルクリックを実装 |
| `frontend/tests/unit/lib/calendar/period.test.ts` | 期間算出ロジックの単体テスト（Step 3） |
| `frontend/tests/unit/lib/calendar/availability-to-events.test.ts` | 空き状況変換ロジックの単体テスト（Step 3） |

## 変更（既存ファイル）

| ファイル | 変更内容 |
|---|---|
| `frontend/src/app/(authenticated)/resources/[id]/page.tsx` | `<ResourceAvailabilityCalendar resourceId={resource.id} />` を追加（既存の空き確認リストは維持）。カレンダーの表示幅を確保するためコンテナを `max-w-2xl` → `max-w-4xl` に変更 |
| `frontend/src/app/(authenticated)/reservations/new/page.tsx` | `searchParams.startAt` を読み取り `ReservationForm` に `defaultStartAt` として渡す処理を追加 |
| `frontend/src/app/(authenticated)/reservations/new/ReservationForm.tsx` | `defaultStartAt` prop を追加し、`startAt` の `defaultValues` に設定 |
| `frontend/src/app/globals.css` | `react-big-calendar` の基本 CSS を `@import`。グレーアウト（`.calendar-event-occupied`）・日セルの予約ありスタイル（`.calendar-day-has-reservation`）を追加（既存の shadcn/ui デザイントークンを再利用） |
| `frontend/package.json` | `react-big-calendar`・`date-fns`（dependencies）、`@types/react-big-calendar`（devDependencies）を追加 |

## 依存関係の追加

- `react-big-calendar@^1.20.0`（MIT）
- `date-fns@^4.4.0`（MIT）
- `@types/react-big-calendar@^1.16.3`（devDependency。react-big-calendar 自体が型定義を同梱していないため追加）

両パッケージとも `pnpm view <pkg> license` でライセンスを確認済み（MIT）。React 19 / Next.js 15 との `pnpm peers check` でも問題は検出されなかった。

## テスト・検証結果

- `pnpm test`：99件全て成功（新規19件を含む）
- `pnpm lint`：エラーなし
- `pnpm format:check`：フォーマット済み
- `npx tsc --noEmit`：型エラーなし

## 既知のトレードオフ

- **data-testid の網羅性**：Code Generation の「Automation Friendly Code Rules」に従い、カレンダーのコンテナ（`resource-availability-calendar`）とエラー表示（`availability-calendar-error`）には `data-testid` を付与した。react-big-calendar が内部レンダリングするツールバーボタン（前へ・次へ・今日・週・月）自体には `data-testid` を付与していない（サードパーティコンポーネント内部のDOM構造を直接編集せずに付与する手段がないため）。Build and Test ステージの Playwright シナリオでは、react-big-calendar が出力するボタンのロール・テキスト（例：「前へ」「次へ」「週」「月」）に基づくロケーターで操作する方針とする
- **コンポーネントのレンダリング単体テスト**：既存の `pagination-nav.test.ts` 等の方針を踏襲し、Server/Client Component 自体のレンダリング検証は Vitest では行わず、業務ロジック（`period.ts`・`availability-to-events.ts`）の純粋関数テストに集約した。インタラクションの検証は Build and Test ステージの Playwright E2E で行う
