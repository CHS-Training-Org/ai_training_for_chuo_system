/**
 * CSV 帳票出力 Route Handler（csv-export.md RPT-01〜05 準拠）。
 *
 * バックエンドは JWT Bearer トークン認証のみを受け付け Cookie セッションに対応しないため、
 * ブラウザから `/reservations` ページの `<a href>` でここへナビゲートし、
 * このハンドラがセッション検証 → 認証済みバックエンド呼び出し → レスポンス透過転送を代行する
 * （Docs/spec/aidlc-docs/inception/application-design/application-design.md §設計判断5 参照）。
 */
import { NextRequest } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { createApiClient } from "@/lib/api-client";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, string | string[]> = {};
  const statuses = searchParams.getAll("status");
  if (statuses.length > 0) params.status = statuses;
  const from = searchParams.get("from");
  if (from) params.from = from;
  const to = searchParams.get("to");
  if (to) params.to = to;

  const client = createApiClient(getAccessToken);
  const backendResponse = await client.getRaw("/reports/reservations/csv", params);

  const headers = new Headers();
  const contentType = backendResponse.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentDisposition = backendResponse.headers.get("Content-Disposition");
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers,
  });
}
