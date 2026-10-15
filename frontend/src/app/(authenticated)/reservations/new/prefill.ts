const DATE_TIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * クエリパラメータの `startAt` / `endAt` を、`datetime-local` 入力の初期値として検証する。
 * `YYYY-MM-DDTHH:mm`（秒なし）で、実在する日時のときだけ値を返す。それ以外は空文字（無視）。
 */
export function parseDateTimeLocalParam(value: string | undefined): string {
  if (typeof value !== "string") return "";
  const m = DATE_TIME_LOCAL.exec(value);
  if (!m) return "";
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const valid =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d &&
    date.getUTCHours() === h &&
    date.getUTCMinutes() === mi;
  return valid ? value : "";
}
