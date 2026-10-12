import { barPercent } from "./usage-format";

export interface UsageBarRow {
  id: string;
  label: string;
  value: number;
  /** 棒の右に併記する表示用の文字列（例: "12 件"、"2.5 時間"）。 */
  display: string;
}

interface UsageBarChartProps {
  title: string;
  /** 棒の色の Tailwind クラス（例: "bg-chart-1"）。 */
  colorClass: string;
  rows: UsageBarRow[];
  testId: string;
}

/**
 * リソース別の横棒グラフ（依存なしの自前実装、Server Component）。
 *
 * 棒の長さはこのグラフ内の最大値を 100% とした相対値。棒は装飾（aria-hidden）で、
 * 値は数値の文字として併記し、色や長さだけに頼らず読めるようにする。
 */
export function UsageBarChart({ title, colorClass, rows, testId }: UsageBarChartProps) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4" data-testid={testId}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[8rem_1fr_5rem] items-center gap-2 text-sm"
            data-testid={`${testId}-row-${row.id}`}
          >
            <span className="truncate" title={row.label}>
              {row.label}
            </span>
            <div className="h-4 rounded bg-muted" aria-hidden="true">
              <div
                className={`h-4 rounded ${colorClass}`}
                style={{ width: `${barPercent(row.value, max)}%` }}
                data-testid={`${testId}-bar-${row.id}`}
              />
            </div>
            <span className="text-right tabular-nums">{row.display}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
