"use server";

import { createApiClient } from "@/lib/api-client";
import {
  AvailabilitySlotSchema,
  ResourceResponseSchema,
  type ResourceResponse,
} from "@/lib/types/api";
import { getAccessToken } from "@/lib/session";

// 入力スキーマは 'use server' ファイルから export できないため lib/schemas/resource.ts に分離している。
import type { CreateResourceInput, UpdateResourceInput } from "@/lib/schemas/resource";

export type { CreateResourceInput, UpdateResourceInput } from "@/lib/schemas/resource";

// ---------------------------------------------------------------------------
// リソース一覧パラメータ
// ---------------------------------------------------------------------------

export interface ListResourcesParams {
  category?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * リソース一覧を取得する（全ロール・認証必須）。
 *
 * ADMIN は is_active=false のリソースも含む（BE 側でロール判定）。
 * from/to を指定した場合は当該時間帯に占有予約のあるリソースを除外した結果を返す。
 */
export async function listResourcesAction(params?: ListResourcesParams) {
  const client = createApiClient(getAccessToken);
  const queryParams: Record<string, string> = {};
  if (params?.category) queryParams.category = params.category;
  if (params?.from) queryParams.from = params.from;
  if (params?.to) queryParams.to = params.to;
  if (params?.page !== undefined) queryParams.page = String(params.page);
  if (params?.size !== undefined) queryParams.size = String(params.size);

  return client.getPaginated("/resources", ResourceResponseSchema, queryParams);
}

/**
 * リソース詳細を取得する（全ロール・認証必須）。
 *
 * @param id リソース ID
 */
export async function getResourceAction(id: string) {
  const client = createApiClient(getAccessToken);
  return client.get(`/resources/${id}`, ResourceResponseSchema);
}

/**
 * 指定リソースの占有済み時間スロットを取得する（全ロール・認証必須）。
 *
 * @param id リソース ID
 * @param from 照会開始日時（ISO 文字列）
 * @param to 照会終了日時（ISO 文字列）
 */
export async function getAvailabilityAction(id: string, from: string, to: string) {
  const client = createApiClient(getAccessToken);
  return client.getArray(`/resources/${id}/availability`, AvailabilitySlotSchema, { from, to });
}

/**
 * リソースを登録する（ADMIN のみ）。
 *
 * @param input 登録データ
 */
export async function createResourceAction(input: CreateResourceInput): Promise<ResourceResponse> {
  const client = createApiClient(getAccessToken);
  return client.post("/resources", input, ResourceResponseSchema);
}

/**
 * リソースを更新する（ADMIN のみ）。
 *
 * @param id リソース ID
 * @param input 更新データ
 */
export async function updateResourceAction(
  id: string,
  input: UpdateResourceInput,
): Promise<ResourceResponse> {
  const client = createApiClient(getAccessToken);
  return client.put(`/resources/${id}`, input, ResourceResponseSchema);
}

/**
 * リソースの有効/無効を切り替える（ADMIN のみ）。
 *
 * @param id リソース ID
 * @param isActive true = 有効、false = 無効
 */
export async function changeResourceStatusAction(
  id: string,
  isActive: boolean,
): Promise<ResourceResponse> {
  const client = createApiClient(getAccessToken);
  return client.patch(`/resources/${id}/status`, { isActive }, ResourceResponseSchema);
}
