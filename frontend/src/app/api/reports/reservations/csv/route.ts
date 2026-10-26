/**
 * 予約 CSV 出力の中継 Route Handler（BFF）。
 *
 * ブラウザの JavaScript は JWT を読めず、`/api/backend` の rewrite は Authorization ヘッダを付けないため、
 * ブラウザから backend へ直接リンクすると 401 になる。この Route Handler がサーバー側で JWT を付けて
 * backend の `GET /api/reports/reservations/csv`（api-spec.md §帳票出力）を呼び、CSV の本文と
 * ヘッダ（Content-Type / Content-Disposition）をそのまま中継する。
 *
 * - 受け取るクエリは `from` / `to` / `status`（複数）のみ。空文字と余分なキーは backend に渡さない。
 * - 失敗時は画面（`/admin/reports`）へ 303 でリダイレクトし、画面上にメッセージを出す。
 *   未認証（トークンなし・401）は `/auth/signin` へ。
 * - 業務ルール（期間の判定・書式・エスケープ）は持たない。正は backend。
 */
import { ApiClientError, createApiClient } from "@/lib/api-client";
import { getAccessToken } from "@/lib/session";

export const dynamic = "force-dynamic";

const BACKEND_PATH = "/reports/reservations/csv";
const SIGN_IN_PATH = "/auth/signin";
const REPORTS_PATH = "/admin/reports";

/** 303 リダイレクト（Location は絶対 URL が必要なため request.url を基準に解決する）。 */
function redirectTo(path: string, request: Request): Response {
  return Response.redirect(new URL(path, request.url), 303);
}

/** リクエストのクエリから backend に渡すパラメータだけを取り出す。 */
function pickParams(request: Request): Record<string, string | string[]> {
  const searchParams = new URL(request.url).searchParams;
  const params: Record<string, string | string[]> = {};

  const from = searchParams.get("from")?.trim();
  if (from) params.from = from;

  const to = searchParams.get("to")?.trim();
  if (to) params.to = to;

  const statuses = searchParams
    .getAll("status")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  if (statuses.length > 0) params.status = statuses;

  return params;
}

export async function GET(request: Request): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    return redirectTo(SIGN_IN_PATH, request);
  }

  try {
    const client = createApiClient(async () => token);
    const res = await client.getRaw(BACKEND_PATH, pickParams(request));

    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") ?? "text/csv; charset=UTF-8");
    const disposition = res.headers.get("Content-Disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    headers.set("Cache-Control", "no-store");

    return new Response(res.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (error.status === 401) {
        return redirectTo(SIGN_IN_PATH, request);
      }
      return redirectTo(`${REPORTS_PATH}?error=${encodeURIComponent(error.code)}`, request);
    }
    // backend に届かないなど、ApiClientError 以外の例外
    return redirectTo(`${REPORTS_PATH}?error=INTERNAL_SERVER_ERROR`, request);
  }
}
