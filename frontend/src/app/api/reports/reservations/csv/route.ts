import { ApiClientError, createApiClient } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

/**
 * 予約 CSV ダウンロードの中継（BFF）。
 *
 * JWT はサーバー側（セッション）にあり、ブラウザからバックエンドを直接呼べないため、
 * ここで `GET /api/reports/reservations/csv` を呼び、CSV をそのままブラウザへ返す。
 * ADMIN 以外の拒否（403）やパラメータ不正（400）はバックエンドが判定し、
 * `{ code, message }` と元のステータスをそのまま中継する。
 */
export const dynamic = "force-dynamic";

const PASS_THROUGH_HEADERS = ["Content-Type", "Content-Disposition"];

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string | string[]> = {};
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.getAll("status");
  if (from) params.from = from;
  if (to) params.to = to;
  if (status.length > 0) params.status = status;

  try {
    const res = await createApiClient(getAccessToken).getRaw("/reports/reservations/csv", params);
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const name of PASS_THROUGH_HEADERS) {
      const value = res.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(res.body, { status: 200, headers });
  } catch (e) {
    if (e instanceof ApiClientError) {
      return Response.json({ code: e.code, message: e.message }, { status: e.status });
    }
    return Response.json(
      { code: "INTERNAL_SERVER_ERROR", message: "予期しないエラーが発生しました。" },
      { status: 500 },
    );
  }
}
