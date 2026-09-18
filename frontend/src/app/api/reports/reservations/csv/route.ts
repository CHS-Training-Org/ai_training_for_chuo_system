import { getAccessToken } from "@/lib/session";

/**
 * CSV 帳票出力の認証付きストリーミングプロキシ。
 *
 * ブラウザの `<a download>` ナビゲーションは `Authorization` ヘッダを付与できないため、
 * サーバー側でトークンを解決してからバックエンドへ中継する（Application Design 参照）。
 *
 * 認可の再判定はここでは行わない。バックエンドの `@PreAuthorize("hasRole('ADMIN')")` が
 * 権威であり、その 403 をそのまま透過することが受入条件（US-03）を満たす。
 *
 * cookie 依存のため動的実行を強制する（ビルド時の静的化を防ぐ）。
 */
export const dynamic = "force-dynamic";

/** バックエンドへの転送を許可するクエリパラメータ（許可リスト。汎用プロキシ化を防ぐ）。 */
const FORWARD_PARAMS = ["from", "to", "status"] as const;

export async function GET(request: Request): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    return Response.json({ code: "UNAUTHORIZED", message: "認証が必要です。" }, { status: 401 });
  }

  // ベース URL の組み立ては api-client.ts のサーバー側分岐と同じ規則
  // （api-client.ts は JSON 専用で本エンドポイントには使えないため独立実装する）
  const origin = process.env.BACKEND_URL ?? "http://localhost:8080";
  const upstreamUrl = new URL("/api/reports/reservations/csv", origin);
  const incoming = new URL(request.url).searchParams;
  for (const key of FORWARD_PARAMS) {
    for (const value of incoming.getAll(key)) {
      upstreamUrl.searchParams.append(key, value);
    }
  }

  const upstream = await fetch(upstreamUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="reservations.csv"',
      "Cache-Control": "no-store",
    },
  });
}
