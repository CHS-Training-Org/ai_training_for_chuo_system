import { getAccessToken } from "@/lib/session";

/**
 * 予約一覧 CSV のダウンロード用 Route Handler（GET /api/reports/reservations/csv）。
 *
 * ブラウザは Bearer トークンを持たないため、サーバー側でトークンを付けてバックエンドの
 * GET /api/reports/reservations/csv を呼び、結果をバイト列のまま中継する（文字列にデコードすると
 * 先頭の BOM が崩れうるため、本文は ReadableStream のまま渡す）。
 * 共通の API クライアント（createApiClient）は JSON 前提のため使わず、fetch を直接呼ぶ。
 *
 * - 転送するクエリは status（複数）・from・to のみ（resourceName・page は CSV の対象外）
 * - バックエンドの非 2xx（400・401・403 等）はステータス・本文・Content-Type をそのまま返す
 */

const BACKEND_CSV_PATH = "/api/reports/reservations/csv";

/**
 * datetime-local 入力値（"2025-06-10T10:00" 16文字）を秒付き ISO 文字列に正規化する。
 * server/actions/reservations.ts の同名関数と同じ規則（"use server" ファイルの非公開関数のため複製）。
 */
function toIsoWithSeconds(value: string): string {
  if (value.length === 16) return `${value}:00`;
  return value;
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ code, message }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    return jsonError(401, "UNAUTHORIZED", "認証が必要です。");
  }

  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const s of incoming.getAll("status")) {
    if (s) query.append("status", s);
  }
  const from = incoming.get("from");
  const to = incoming.get("to");
  if (from) query.set("from", toIsoWithSeconds(from));
  if (to) query.set("to", toIsoWithSeconds(to));

  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const qs = query.toString();
  const url = `${backendUrl}${BACKEND_CSV_PATH}${qs ? `?${qs}` : ""}`;

  let res: Response;
  try {
    // Accept を text/csv のみにすると、エラー応答（JSON）が 406 になるため */* で呼ぶ
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
      cache: "no-store",
    });
  } catch {
    return jsonError(502, "BACKEND_UNAVAILABLE", "バックエンドに接続できません。");
  }

  const headers = new Headers();
  const contentType = res.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  if (!res.ok) {
    return new Response(res.body, { status: res.status, headers });
  }

  const disposition = res.headers.get("Content-Disposition");
  if (disposition) headers.set("Content-Disposition", disposition);
  headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: 200, headers });
}
