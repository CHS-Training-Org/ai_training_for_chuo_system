"use server";

import { ApiClientError, createApiClient } from "@/lib/api-client";
import { ReservationResponseSchema, type ReservationResponse } from "@/lib/types/api";
import { getAccessToken } from "@/lib/session";
import type { CreateReservationInput, UpdateReservationInput } from "@/lib/schemas/reservation";

// ---------------------------------------------------------------------------
// 一覧パラメータ（"use server" ファイルは非同期関数以外の export 不可のため非公開）
// ---------------------------------------------------------------------------

interface ListReservationsParams {
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
 *
 * `options.draft` が true のときは、下書き（DRAFT）として保存する（重複判定はされない）。
 */
export async function createReservationAction(
  input: CreateReservationInput,
  options?: { draft?: boolean },
): Promise<ReservationResponse> {
  const client = createApiClient(getAccessToken);
  const body = {
    ...input,
    startAt: toIsoWithSeconds(input.startAt),
    endAt: toIsoWithSeconds(input.endAt),
    ...(options?.draft ? { draft: true } : {}),
  };
  return client.post("/reservations", body, ReservationResponseSchema);
}

/**
 * 予約内容を更新する（PENDING と DRAFT のみ・申請者本人）。
 *
 * 日時変更時に重複が発生した場合は ApiClientError(409) をスロー。
 *
 * 予約が DRAFT のとき、`options.draft` が true なら下書きのまま更新し、
 * 指定しなければ正式申請になる（重複判定あり。承認要は PENDING、不要は APPROVED）。
 */
export async function updateReservationAction(
  id: string,
  input: UpdateReservationInput,
  options?: { draft?: boolean },
): Promise<ReservationResponse> {
  const client = createApiClient(getAccessToken);
  const body = {
    ...input,
    startAt: toIsoWithSeconds(input.startAt),
    endAt: toIsoWithSeconds(input.endAt),
    ...(options?.draft ? { draft: true } : {}),
  };
  return client.put(`/reservations/${id}`, body, ReservationResponseSchema);
}

/**
 * 予約内容の更新・下書きの正式申請を行い、時間帯の重複（409）を「結果の値」として返す。
 *
 * Server Action が投げたエラーは、ブラウザ側に届くときにクラスの情報を失う。
 * そのため、ブラウザ側で `err instanceof ApiClientError` を使っても重複を判定できず、
 * エラー画面になってしまう。ここ（サーバー側）で重複を判定し、`{ ok: false, conflict: true }` を返す。
 *
 * 重複以外のエラー（422・403・404・500 など）は、従来どおりそのままスローする。
 */
export async function tryUpdateReservationAction(
  id: string,
  input: UpdateReservationInput,
  options?: { draft?: boolean },
): Promise<{ ok: true; reservation: ReservationResponse } | { ok: false; conflict: true }> {
  try {
    const reservation = await updateReservationAction(id, input, options);
    return { ok: true, reservation };
  } catch (err) {
    if (err instanceof ApiClientError && err.code === "RESERVATION_CONFLICT") {
      return { ok: false, conflict: true };
    }
    throw err;
  }
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

/**
 * 下書きを削除する（DRAFT のみ・申請者本人。204 No Content）。
 *
 * 物理削除のため元に戻せない。DRAFT 以外は ApiClientError(422)、本人以外は 403、存在しなければ 404。
 */
export async function deleteReservationAction(id: string): Promise<void> {
  const client = createApiClient(getAccessToken);
  await client.deleteEmpty(`/reservations/${id}`);
}
