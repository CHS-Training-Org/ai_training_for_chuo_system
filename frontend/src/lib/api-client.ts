/**
 * BFF 共通クライアント
 *
 * Server Action / Server Component から Next.js リライト経由でバックエンド API を呼び出す。
 * - サーバー側（Node/undici）: `BACKEND_URL` を直接使用（絶対 URL が必須・リライト不要）
 * - ブラウザ側: `/api/backend/*` → Next.js rewrite → `BACKEND_URL/*`
 *
 * JWT 付与はサーバー側責務。トークン取得部を `getToken` として注入可能にし、
 * カテゴリ 3（認証完成）後に session.ts との結線を差し込む。
 */

import type { ZodTypeAny, z } from "zod";
import { paginatedSchema } from "./types";
import type { ApiError, Paginated } from "./types";

// ---------------------------------------------------------------------------
// エラー型
// ---------------------------------------------------------------------------

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

// ---------------------------------------------------------------------------
// 内部ユーティリティ
// ---------------------------------------------------------------------------

/**
 * リクエストヘッダを組み立てる。
 * `getToken` が null/undefined を返した場合は Authorization ヘッダを付与しない
 * （認証不要エンドポイント用）。
 */
function buildHeaders(token: string | null | undefined): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * レスポンスが非 2xx の場合に ApiClientError をスローする。
 * バックエンドの `{ code, message }` 形式でエラーを返す。
 */
async function assertOk(res: Response): Promise<void> {
  if (res.ok) return;

  let code = `HTTP_${res.status}`;
  let message = res.statusText;

  try {
    const body: ApiError = await res.json();
    if (body.code) code = body.code;
    if (body.message) message = body.message;
  } catch {
    // JSON パース失敗はスルー
  }

  throw new ApiClientError(code, message, res.status);
}

// ---------------------------------------------------------------------------
// 公開 API
// ---------------------------------------------------------------------------

/** トークン取得関数の型（カテゴリ 3 で session.ts と結線） */
export type TokenGetter = () => Promise<string | null>;

/**
 * サーバー側（Node/undici）か否かを判定する。
 * undici は相対 URL を解決できないため、サーバー側では BACKEND_URL を直接使用する。
 */
const _isServer = typeof window === "undefined";

/**
 * クライアントのファクトリ。
 * カテゴリ 3 完成後は `createApiClient(getSessionToken)` として差し込む。
 * カテゴリ 2 開発中は `createApiClient()` でトークンなし（認証不要エンドポイント用）。
 */
export function createApiClient(getToken: TokenGetter = async () => null) {
  async function request(
    method: string,
    path: string,
    options: { body?: unknown; params?: Record<string, string | string[]> } = {},
  ): Promise<Response> {
    const token = await getToken();

    // サーバー側: BACKEND_URL を直接指定（undici は絶対 URL が必須・Next.js rewrite は不要）
    // ブラウザ側: /api/backend/* → Next.js rewrite → BACKEND_URL/* を経由
    //
    // BE の全コントローラは /api 配下にマッピングされている（例: AuthController#getMe は
    // /api/users/me）。path 引数（例: /users/me）はこれを含まないため、BACKEND_URL を
    // 直接指定するサーバー側では prefix に /api を含める必要がある
    // （new URL の絶対パス解決規則により、origin 側に /api を含めても解決時に失われるため）。
    const origin = _isServer
      ? (process.env.BACKEND_URL ?? "http://localhost:8080")
      : "http://localhost"; // URL 組み立て用ダミーオリジン（pathname のみ使用）
    const prefix = _isServer ? "/api" : "/api/backend";
    const url = new URL(`${prefix}${path}`, origin);

    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (Array.isArray(v)) {
          // 繰り返しキー（例: ?status=PENDING&status=APPROVED）
          for (const item of v) {
            url.searchParams.append(k, item);
          }
        } else {
          url.searchParams.set(k, v);
        }
      }
    }

    // サーバー側は絶対 URL（url.toString()）、ブラウザ側は相対パス（rewrite 経由）
    const fetchUrl = _isServer ? url.toString() : url.pathname + url.search;

    const res = await fetch(fetchUrl, {
      method,
      headers: buildHeaders(token),
      ...(options.body !== undefined && {
        body: JSON.stringify(options.body),
      }),
      // Server Actions はキャッシュ無効が基本
      cache: "no-store",
    });

    await assertOk(res);
    return res;
  }

  /**
   * GET → JSON をパースして Zod スキーマで検証する。
   */
  async function get<S extends ZodTypeAny>(
    path: string,
    schema: S,
    params?: Record<string, string | string[]>,
  ): Promise<z.infer<S>> {
    const res = await request("GET", path, { params });
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  /**
   * GET → ページネーションラッパで返す。
   *
   * {@code params} の値は文字列または文字列配列（繰り返しキー対応。例: `status=PENDING&status=APPROVED`）。
   */
  async function getPaginated<S extends ZodTypeAny>(
    path: string,
    itemSchema: S,
    params?: Record<string, string | string[]>,
  ): Promise<Paginated<z.infer<S>>> {
    const schema = paginatedSchema(itemSchema);
    const res = await request("GET", path, { params });
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  /**
   * GET → 配列で返す（departments, approvals/pending など全件返却エンドポイント用）。
   */
  async function getArray<S extends ZodTypeAny>(
    path: string,
    itemSchema: S,
    params?: Record<string, string | string[]>,
  ): Promise<z.infer<S>[]> {
    const res = await request("GET", path, { params });
    const json: unknown = await res.json();
    return itemSchema.array().parse(json);
  }

  /**
   * POST/PUT → レスポンスボディを Zod スキーマで検証して返す。
   */
  async function post<S extends ZodTypeAny>(
    path: string,
    body: unknown,
    schema: S,
  ): Promise<z.infer<S>> {
    const res = await request("POST", path, { body });
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  async function put<S extends ZodTypeAny>(
    path: string,
    body: unknown,
    schema: S,
  ): Promise<z.infer<S>> {
    const res = await request("PUT", path, { body });
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  async function patch<S extends ZodTypeAny>(
    path: string,
    body: unknown,
    schema: S,
  ): Promise<z.infer<S>> {
    const res = await request("PATCH", path, { body });
    const json: unknown = await res.json();
    return schema.parse(json);
  }

  /**
   * POST → レスポンスボディなし（204 / cancel 等）。
   */
  async function postEmpty(path: string, body?: unknown): Promise<void> {
    await request("POST", path, { body });
  }

  return { get, getPaginated, getArray, post, put, patch, postEmpty };
}

/**
 * トークンなしのデフォルトクライアント（認証不要エンドポイント・開発用）。
 * カテゴリ 3 完成後は各 Server Action で `createApiClient(getSessionToken)` を使用すること。
 */
export const apiClient = createApiClient();
