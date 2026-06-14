"use server";

import { createApiClient } from "@/lib/api-client";
import { UserResponseSchema } from "@/lib/types/api";
import { getAccessToken } from "@/lib/session";

// ---------------------------------------------------------------------------
// 一覧パラメータ
// ---------------------------------------------------------------------------

export interface ListUsersParams {
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * ユーザー一覧を取得する（ADMIN 専用・ページネーション）。
 *
 * MEMBER / APPROVER からのリクエストは BE 側で 403 Forbidden を返す
 * （{@code ApiClientError(code='FORBIDDEN', status=403)} としてスロー）。
 */
export async function listUsersAction(params?: ListUsersParams) {
  const client = createApiClient(getAccessToken);
  const queryParams: Record<string, string> = {};
  if (params?.page !== undefined) queryParams.page = String(params.page);
  if (params?.size !== undefined) queryParams.size = String(params.size);
  return client.getPaginated("/users", UserResponseSchema, queryParams);
}
