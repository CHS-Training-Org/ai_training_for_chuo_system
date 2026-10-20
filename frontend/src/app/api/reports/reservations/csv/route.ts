/**
 * 予約 CSV のダウンロード中継 Route Handler（api-spec.md §帳票 / screen-spec.md `/admin/reports`）。
 *
 * ADR-004（Server Actions 主体）の唯一の例外。Server Action はファイル（`Content-Disposition` 付き・
 * ストリーミング）の応答に向かないため、Route Handler で BE の CSV をそのまま中継する。
 * JWT はサーバー側で付与し、ブラウザには渡さない（BFF 方針は維持）。
 *
 * BE が 400 / 401 / 403 / 5xx を返したとき、または JWT が無いときは、`/admin/reports?error=<code>`
 * へ 303 リダイレクトする（ページが許可リストの値だけを日本語の警告にする）。
 */
import { toIsoWithSeconds } from "@/lib/datetime";
import { getAccessToken } from "@/lib/session";

const REPORTS_PAGE = "/admin/reports";
const CODE_PATTERN = /^[A-Z0-9_]{1,64}$/;

/**
 * `/admin/reports?error=<code>` へ 303 で戻す。
 *
 * Location は相対パスにする。`request.url` の origin から絶対 URL を組み立てると、`next dev -H 0.0.0.0`
 * やリバースプロキシ配下で内部ホスト（例: `http://0.0.0.0:3000`）がブラウザに渡ってしまう。
 * 相対 Location は RFC 9110 で許可されており、ブラウザが現在のオリジンで解決する。
 */
function redirectWithError(code: string): Response {
  const params = new URLSearchParams({ error: code });
  return new Response(null, {
    status: 303,
    headers: { Location: `${REPORTS_PAGE}?${params.toString()}` },
  });
}

/** BE のエラー本文 `{ code }` からコードを取り出す。読めない・形式不正なら `HTTP_<status>`。 */
async function errorCodeOf(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    const code = (body as { code?: unknown } | null)?.code;
    if (typeof code === "string" && CODE_PATTERN.test(code)) return code;
  } catch {
    // JSON でない本文は HTTP ステータスで代替する
  }
  return `HTTP_${res.status}`;
}

export async function GET(request: Request): Promise<Response> {
  const token = await getAccessToken();
  if (!token) return redirectWithError("UNAUTHORIZED");

  const incoming = new URL(request.url).searchParams;
  const backendUrl = new URL(
    "/api/reports/reservations/csv",
    process.env.BACKEND_URL ?? "http://localhost:8080",
  );
  for (const status of incoming.getAll("status")) {
    if (status) backendUrl.searchParams.append("status", status);
  }
  for (const key of ["from", "to"] as const) {
    const value = incoming.get(key);
    if (value) backendUrl.searchParams.set(key, toIsoWithSeconds(value));
  }

  let res: Response;
  try {
    res = await fetch(backendUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return redirectWithError("INTERNAL_SERVER_ERROR");
  }

  if (!res.ok) return redirectWithError(await errorCodeOf(res));

  // BE のヘッダを引き継ぎ、キャッシュ・MIME スニッフィングを禁止する（個人情報を含む応答のため）。
  const headers = new Headers();
  for (const name of ["Content-Type", "Content-Disposition"]) {
    const value = res.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(res.body, { status: 200, headers });
}
