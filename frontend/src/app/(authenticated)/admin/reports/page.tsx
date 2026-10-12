import { ApiClientError } from "@/lib/api-client";
import type { ResourceUsageResponse } from "@/lib/types/api";
import { getResourceUsageAction } from "@/server/actions/statistics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsageBarChart } from "./UsageBarChart";
import { UsageFilterForm } from "./UsageFilterForm";
import { formatHours } from "./usage-format";

/**
 * 利用実績画面（screen-spec.md §/admin/reports 準拠）。
 *
 * ADMIN 専用（親 admin/layout.tsx でロールガード済み。非 ADMIN にはこのページも Server Action も実行されない）。
 * リソース別の承認済み予約の件数と合計利用時間を、期間（URL の from・to）で集計して棒グラフと表で表示する。
 * URL を直接指定して API が VALIDATION_ERROR（400）を返したときは、メッセージを画面内に表示する。
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const from = typeof sp.from === "string" && sp.from ? sp.from : undefined;
  const to = typeof sp.to === "string" && sp.to ? sp.to : undefined;

  let usage: ResourceUsageResponse[] = [];
  let errorMessage: string | undefined;
  try {
    usage = await getResourceUsageAction({ from, to });
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "VALIDATION_ERROR") {
      errorMessage = error.message;
    } else {
      throw error;
    }
  }

  const periodLabel = from && to ? `${from.slice(0, 16)} 〜 ${to.slice(0, 16)}` : "全期間";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">利用実績</h1>
        <p className="text-sm text-muted-foreground" data-testid="usage-period-label">
          対象期間: {periodLabel}（承認済みの予約のみ集計）
        </p>
      </div>

      <UsageFilterForm defaultFrom={from} defaultTo={to} />

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-4 text-sm text-destructive"
          data-testid="usage-error"
        >
          {errorMessage}
        </p>
      ) : usage.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="usage-empty">
          表示するリソースがありません。
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <UsageBarChart
              title="予約件数"
              colorClass="bg-chart-1"
              testId="usage-chart-count"
              rows={usage.map((u) => ({
                id: u.resourceId,
                label: u.resourceName,
                value: u.reservationCount,
                display: `${u.reservationCount} 件`,
              }))}
            />
            <UsageBarChart
              title="合計利用時間（時間）"
              colorClass="bg-chart-2"
              testId="usage-chart-hours"
              rows={usage.map((u) => ({
                id: u.resourceId,
                label: u.resourceName,
                value: u.totalMinutes,
                display: `${formatHours(u.totalMinutes)} 時間`,
              }))}
            />
          </div>

          <Table data-testid="usage-table">
            <TableHeader>
              <TableRow>
                <TableHead>リソース名</TableHead>
                <TableHead>予約件数</TableHead>
                <TableHead>合計利用時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((u) => (
                <TableRow key={u.resourceId} data-testid={`usage-table-row-${u.resourceId}`}>
                  <TableCell>{u.resourceName}</TableCell>
                  <TableCell>{u.reservationCount} 件</TableCell>
                  <TableCell>{formatHours(u.totalMinutes)} 時間</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
