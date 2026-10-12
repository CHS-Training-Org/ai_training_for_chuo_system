# Frontend Components — usage-report

パス略記：`F/` = `frontend/src/`。

## コンポーネント構成

```text
F/app/(authenticated)/admin/reports/page.tsx            (新規)  Server Component。取得・エラー処理・描画
  +- UsageFilterForm.tsx                                (新規)  Client Component。期間入力と検証
  +- UsageBarChart.tsx                                  (新規)  Server Component。自前の横棒グラフ
  +- usage-format.ts                                    (新規)  純粋関数。時間の整形と棒の幅

F/server/actions/statistics.ts                          (新規)  getResourceUsageAction
F/lib/datetime.ts                                       (新規)  toIsoWithSeconds の共通化
F/lib/types/api.ts                                      (変更)  ResourceUsageResponseSchema を追加
F/components/layout/nav-items.ts                        (変更)  ADMIN_ITEMS に「利用実績」を追加
```

グラフライブラリは使わず、依存の追加もない（ADR は追加しない）。ADMIN ガードは `admin/layout.tsx` が継承される（変更なし）。

## 1. `lib/datetime.ts`（新規）

```ts
/** datetime-local 入力値（16 文字）を秒付き ISO 文字列（19 文字）に正規化する。 */
export function toIsoWithSeconds(value: string): string
```

既存の同名関数（`server/actions/reservations.ts` の非公開関数と、CSV の `route.ts` の複製）は変更しない。新規コードだけがこれを使う。テストは `tests/unit/datetime.test.ts`（16 文字は `:00` を補う、19 文字はそのまま）。

## 2. `lib/types/api.ts`（変更）

```ts
export const ResourceUsageResponseSchema = z.object({
  resourceId: z.string(),
  resourceName: z.string(),
  reservationCount: z.number().int(),
  totalMinutes: z.number().int(),
});
export type ResourceUsageResponse = z.infer<typeof ResourceUsageResponseSchema>;
```

`resourceId` の型は、同ファイルの既存スキーマの `id` と同じ書き方に揃える。

## 3. `server/actions/statistics.ts`（新規）

- `"use server"`。`getResourceUsageAction(params?: { from?: string; to?: string })`
- `createApiClient(getAccessToken)` を作り、`from`・`to` があれば `toIsoWithSeconds` で整えて `client.getArray("/statistics/resources", ResourceUsageResponseSchema, queryParams)` を呼ぶ（ページングなしの配列。`getArray` は非 2xx で `ApiClientError` を投げる）
- パラメータ型の interface は非公開（"use server" ファイルは非同期関数以外を export できない）。BR-18

## 4. `usage-format.ts`（新規、純粋関数）

- `formatHours(minutes: number): string`：`(Math.round(minutes / 6) / 10).toFixed(1)`（BR-14）
- `barPercent(value: number, max: number): number`：`max > 0 ? value / max * 100 : 0`（BR-15）

## 5. `UsageBarChart.tsx`（新規、Server Component）

- **Props**：`title: string`、`colorClass: string`（`bg-chart-1` / `bg-chart-2`）、`rows: { id: string; label: string; value: number; display: string }[]`、`testId: string`
- **描画**：見出しと、行ごとの「リソース名 / 棒 / 数値」。棒は `div` の `style={{ width: \`${barPercent(value, max)}%\` }}` で、色は `colorClass`。最大値は `rows` の `value` の最大
- **アクセシビリティ**：棒は装飾（`aria-hidden`）にし、数値は文字として併記する（色や長さだけに頼らない）。各行に `data-testid`（`${testId}-row-${id}`）

## 6. `UsageFilterForm.tsx`（新規、Client Component）

- **Props**：`defaultFrom?: string`、`defaultTo?: string`
- **入力**：`datetime-local` の `from`・`to`（`defaultValue` は `.slice(0, 16)`）。`data-testid` は `usage-filter-from-input`・`usage-filter-to-input`・`usage-filter-submit`・`usage-filter-reset`
- **送信**：BR-13 の検証（片方のみ、`from >= to`）に通れば `router.push`、違反なら `role="alert"` のメッセージ（`usage-filter-error`）を表示して遷移しない。両方空なら `/admin/reports`
- **リセット**：`router.push("/admin/reports")`、入力のエラー表示も消す

## 7. `page.tsx`（新規、Server Component）

- **処理**：business-logic-model.md §3.1 のとおり（`searchParams` → Server Action → `VALIDATION_ERROR` の捕捉 → 描画）
- **見出し**：「利用実績」。説明に対象期間（期間未指定は「全期間」、指定時は `from` 〜 `to`）と「承認済みの予約のみ集計」を表示
- **エラー**：`VALIDATION_ERROR` のメッセージを `role="alert"` の領域（`data-testid="usage-error"`）に表示し、グラフと表は出さない
- **グラフ**：「予約件数」（`bg-chart-1`、表示は `${count} 件`）と「合計利用時間（時間）」（`bg-chart-2`、表示は `formatHours(minutes) 時間`）の 2 つの `UsageBarChart`。件数と時間で並びは同じ（API の並び順）
- **表**：既存の `Table` コンポーネントで「リソース名」「予約件数」「合計利用時間」（`formatHours` + 「時間」）。`data-testid="usage-table"`
- **空**：配列が空のとき「表示するリソースがありません。」（`data-testid="usage-empty"`）

## 8. `nav-items.ts`（変更）

`ADMIN_ITEMS` に `{ label: "利用実績", href: "/admin/reports" }` を末尾に追加。`tests/unit/layout/nav-items.test.ts` の `adminHrefs` に `/admin/reports` を足す。

## 9. テスト（`frontend/tests/unit/`）

- `datetime.test.ts`（新規）：BR-18 の補完
- `usage-format.test.ts`（新規）：`formatHours`（150→2.5、0→0.0、3→0.1、59→1.0）、`barPercent`（最大値に対する相対値、最大値 0 で 0）
- `usage-bar-chart.test.tsx`（新規）：行ごとの数値の併記、最大値の行が 100% の幅、値 0 の行が 0%、最大値 0 で全行 0%
- `usage-filter-form.test.tsx`（新規）：`next/navigation` をモック。片方のみ・`from >= to`（同値を含む）でメッセージと遷移なし、正常時の `router.push`、両方空で `/admin/reports`、リセット
- `admin-reports-page.test.tsx`（新規）：Server Action をモック。表の行と並び・時間の整形・空の状態メッセージ、`VALIDATION_ERROR` でメッセージ表示とグラフ非表示、それ以外のエラーは再 throw
- `server/actions/statistics.test.ts`（新規）：MSW で `/api/backend/statistics/resources` をテストごとにスタブ。`from`/`to` の秒補完と転送、パラメータなしでクエリなし、レスポンスの Zod 検証
- `layout/nav-items.test.ts`（変更）：ADMIN に `/admin/reports` が出る、MEMBER・APPROVER には出ない
- `tests/unit/msw/handlers.ts` は変更しない（テストごとの `server.use` でスタブする）
