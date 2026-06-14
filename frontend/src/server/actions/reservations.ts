"use server";

import { createApiClient } from "@/lib/api-client";
import { ReservationResponseSchema, type ReservationResponse } from "@/lib/types/api";
import { getAccessToken } from "@/lib/session";
import type { CreateReservationInput, UpdateReservationInput } from "@/lib/schemas/reservation";

// ---------------------------------------------------------------------------
// リクエスト入力スキーマ（フォームバリデーション用）
// ---------------------------------------------------------------------------
// 'use server' ファイルからは Zod スキーマオブジェクトを export できないため
// （Next.js の制約：非同期関数以外のオブジェクト export は不可）、
// スキーマ定義は lib/schemas/reservation.ts に分離している。
// 型定義は re-export（型情報は 'use server' 制約の対象外）。
// ---------------------------------------------------------------------------

export type { CreateReservationInput, UpdateReservationInput } from "@/lib/schemas/reservation";

// ---------------------------------------------------------------------------
// 一覧パラメータ
// ---------------------------------------------------------------------------

export interface ListReservationsParams {
  status?: string[];
  page?: number;
  size?: number;
}

// ---------------------------------------------------------------------------
// datetime-local → ISO 秒付き変換ユーティリティ
// ---------------------------------------------------------------------------

/**
 * datetime-local 入力値（"2025-06-10T10:00" 16文字）を
 * BE が期待する秒付き ISO 文字列（"2025-06-10T10:00:00" 19文字）に正規化する。
 */
function toIsoWithSeconds(value: string): string {
  if (value.length === 16) return `${value}:00`;
  return value;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * 予約一覧を取得する。
 *
 * ADMIN は全件、それ以外は本人分のみ（BE 側でロール判定）。
 * {@code status} は複数指定可（e.g. `['PENDING', 'APPROVED']`）。
 */
export async function listReservationsAction(params?: ListReservationsParams) {
  const client = createApiClient(getAccessToken);
  const queryParams: Record<string, string | string[]> = {};
  if (params?.status && params.status.length > 0) queryParams.status = params.status;
  if (params?.page !== undefined) queryParams.page = String(params.page);
  if (params?.size !== undefined) queryParams.size = String(params.size);
  return client.getPaginated("/reservations", ReservationResponseSchema, queryParams);
}

/**
 * 予約詳細を取得する。
 *
 * MEMBER は本人の予約のみ取得可（他人の予約は 403 → ApiClientError）。
 */
export async function getReservationAction(id: string): Promise<ReservationResponse> {
  const client = createApiClient(getAccessToken);
  return client.get(`/reservations/${id}`, ReservationResponseSchema);
}

/**
 * 予約を申請する（201 Created）。
 *
 * {@code requires_approval=false} → 即 APPROVED、{@code true} → PENDING。
 * 重複時は ApiClientError(code='RESERVATION_CONFLICT', status=409) をスロー。
 */
export async function createReservationAction(
  input: CreateReservationInput,
): Promise<ReservationResponse> {
  const client = createApiClient(getAccessToken);
  const body = {
    ...input,
    startAt: toIsoWithSeconds(input.startAt),
    endAt: toIsoWithSeconds(input.endAt),
  };
  return client.post("/reservations", body, ReservationResponseSchema);
}

/**
 * 予約内容を更新する（PENDING のみ・申請者本人）。
 *
 * 日時変更時に重複が発生した場合は ApiClientError(409) をスロー。
 */
export async function updateReservationAction(
  id: string,
  input: UpdateReservationInput,
): Promise<ReservationResponse> {
  const client = createApiClient(getAccessToken);
  const body = {
    ...input,
    startAt: toIsoWithSeconds(input.startAt),
    endAt: toIsoWithSeconds(input.endAt),
  };
  return client.put(`/reservations/${id}`, body, ReservationResponseSchema);
}

/**
 * 予約をキャンセルする（PENDING/APPROVED のみ・本人 or ADMIN）。
 *
 * レスポンスは更新後の ReservationResponse（status='CANCELLED'）。
 * NOTE: {@code postEmpty} ではなく {@code post} を使用すること（api-spec L606 で 200 + ボディあり）。
 */
export async function cancelReservationAction(id: string): Promise<ReservationResponse> {
  const client = createApiClient(getAccessToken);
  return client.post(`/reservations/${id}/cancel`, undefined, ReservationResponseSchema);
}
