"use server";

import { createApiClient } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

// ---------------------------------------------------------------------------
// CSV 出力パラメータ（"use server" ファイルは非同期関数以外の export 不可のため非公開）
// ---------------------------------------------------------------------------

interface ExportReservationsCsvParams {
  /** datetime-local の値（例 "2026-06-01T00:00"）。to と同時に指定する */
  from?: string;
  /** datetime-local の値。from と同時に指定する */
  to?: string;
  status?: string[];
}

/** Content-Disposition が無い・読み取れない場合のファイル名 */
const FALLBACK_FILENAME = "reservations.csv";

// ---------------------------------------------------------------------------
// datetime-local → ISO 秒付き変換ユーティリティ
// ---------------------------------------------------------------------------

/**
 * datetime-local 入力値（"2026-06-01T00:00" 16文字）を
 * BE が期待する秒付き ISO 文字列（"2026-06-01T00:00:00" 19文字）に正規化する。
 */
function toIsoWithSeconds(value: string): string {
  if (value.length === 16) return `${value}:00`;
  return value;
}

/** `Content-Disposition: attachment; filename="..."` からファイル名を取り出す。 */
function parseFilename(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? FALLBACK_FILENAME;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * 予約一覧の CSV を取得する（ADMIN のみ。それ以外は BE が 403 → ApiClientError）。
 *
 * 返す {@code content} は UTF-8 BOM を先頭に含む文字列。ブラウザ側で Blob にしてダウンロードさせる。
 * {@code from} / {@code to} の検証（片方のみ・前後関係）は BE が行い、400 は ApiClientError のまま投げる。
 */
export async function exportReservationsCsvAction(
  params?: ExportReservationsCsvParams,
): Promise<{ filename: string; content: string }> {
  const client = createApiClient(getAccessToken);
  const queryParams: Record<string, string | string[]> = {};
  if (params?.from) queryParams.from = toIsoWithSeconds(params.from);
  if (params?.to) queryParams.to = toIsoWithSeconds(params.to);
  if (params?.status && params.status.length > 0) queryParams.status = params.status;
  const { text, headers } = await client.getText("/reports/reservations/csv", queryParams);
  return { filename: parseFilename(headers.get("Content-Disposition")), content: text };
}
