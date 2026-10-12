/**
 * datetime-local 入力値（"2025-06-10T10:00" 16文字）を
 * BE が期待する秒付き ISO 文字列（"2025-06-10T10:00:00" 19文字）に正規化する。
 *
 * 秒付きの値（19文字）やそれ以外の長さの値はそのまま返す。
 */
export function toIsoWithSeconds(value: string): string {
  if (value.length === 16) return `${value}:00`;
  return value;
}
