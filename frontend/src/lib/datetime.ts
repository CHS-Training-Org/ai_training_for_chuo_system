/**
 * 日時ユーティリティ（サーバー側共通）。
 *
 * `"use server"` ファイルは非同期関数以外を公開できないため、Server Action と Route Handler の
 * 双方から使う変換規則はここに置く（規則の二重実装を避ける）。
 */

/**
 * datetime-local 入力値（"2025-06-10T10:00" 16文字）を
 * BE が期待する秒付き ISO 文字列（"2025-06-10T10:00:00" 19文字）に正規化する。
 * 16 文字以外はそのまま返す。
 */
export function toIsoWithSeconds(value: string): string {
  if (value.length === 16) return `${value}:00`;
  return value;
}
