"use server";

import { z } from "zod";
import { createApiClient } from "@/lib/api-client";
import { ReservationResponseSchema, type ReservationResponse } from "@/lib/types/api";
import { getAccessToken } from "@/lib/session";
import type { CreateReservationInput, UpdateReservationInput } from "@/lib/schemas/reservation";

// ---------------------------------------------------------------------------
// 一覧パラメータ（"use server" ファイルは非同期関数以外の export 不可のため非公開）
// ---------------------------------------------------------------------------

interface ListReservationsParams {
  status?: string[];
  resourceName?: string;
  from?: string;
  to?: string;
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
  if (params?.resourceName) queryParams.resourceName = params.resourceName;
  if (params?.from) queryParams.from = toIsoWithSeconds(params.from);
  if (params?.to) queryParams.to = toIsoWithSeconds(params.to);
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
 * 予約を申請する（201 Created）。レスポンスは常に配列（繰り返さない場合は 1 件）。
 *
 * {@code draft: true} → 下書き保存（DRAFT、承認フローに流れない）。
 * {@code draft} 省略/false の場合：{@code requires_approval=false} → 即 APPROVED、{@code true} → PENDING。
 * {@code recurrenceType} が WEEKLY / MONTHLY のときは、{@code recurrenceUntil} まで繰り返す複数の予約を 1 回で作る
 * （全件が同じステータス・同じ seriesId）。
 * 重複時（既存の予約との重複、繰り返しの予約どうしの重複）は ApiClientError(code='RESERVATION_CONFLICT', status=409)
 * をスローし、1 件も作られない。
 */
export async function createReservationAction(
  input: CreateReservationInput,
): Promise<ReservationResponse[]> {
  const client = createApiClient(getAccessToken);
  const body = {
    ...input,
    startAt: toIsoWithSeconds(input.startAt),
    endAt: toIsoWithSeconds(input.endAt),
  };
  return client.post("/reservations", body, z.array(ReservationResponseSchema));
}

/**
 * 予約内容を更新する（PENDING/DRAFT のみ・申請者本人）。
 *
 * DRAFT の予約に {@code submit: true} を指定すると、内容更新に加えて正式申請（PENDING/APPROVED への遷移）を行う。
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
