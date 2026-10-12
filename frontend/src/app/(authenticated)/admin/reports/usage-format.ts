/**
 * 利用実績ページの表示用ユーティリティ（純粋関数）。
 */

/**
 * 分を時間に換算し、小数第 1 位に四捨五入した文字列で返す（150 分は "2.5"）。
 * 丸めるのは表示だけで、API は分の整数を返す。
 */
export function formatHours(minutes: number): string {
  return (Math.round(minutes / 6) / 10).toFixed(1);
}

/**
 * 棒の長さ（%）。最大値を 100% とした相対値で、最大値が 0 のときは 0（0 で割らない）。
 */
export function barPercent(value: number, max: number): number {
  return max > 0 ? (value / max) * 100 : 0;
}
