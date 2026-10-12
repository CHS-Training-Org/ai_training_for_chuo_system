"use server";

import { createApiClient } from "@/lib/api-client";
import { toIsoWithSeconds } from "@/lib/datetime";
import { ResourceUsageResponseSchema } from "@/lib/types/api";
import { getAccessToken } from "@/lib/session";

// ---------------------------------------------------------------------------
// パラメータ型（"use server" ファイルは非同期関数以外の export 不可のため非公開）
// ---------------------------------------------------------------------------

interface GetResourceUsageParams {
  from?: string;
  to?: string;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * リソース別の利用実績（承認済み予約の件数と合計利用時間）を取得する（ADMIN 専用）。
 *
 * `from`/`to`（datetime-local の値）は秒を補って API に渡す。片方だけの指定や `from >= to` は
 * そのまま API に渡し、400（VALIDATION_ERROR）を ApiClientError として受け取る。
 */
export async function getResourceUsageAction(params?: GetResourceUsageParams) {
  const client = createApiClient(getAccessToken);
  const queryParams: Record<string, string> = {};
  if (params?.from) queryParams.from = toIsoWithSeconds(params.from);
  if (params?.to) queryParams.to = toIsoWithSeconds(params.to);
  return client.getArray("/statistics/resources", ResourceUsageResponseSchema, queryParams);
}
