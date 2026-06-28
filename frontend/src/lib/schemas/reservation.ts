/**
 * 予約フォームの Zod スキーマ定義（クライアント側バリデーション用）。
 *
 * `'use server'` ファイル（server/actions/reservations.ts）からは
 * Zod スキーマオブジェクトを export できないため（Next.js の制約）、
 * このファイルに分離している。
 *
 * POST と PUT のリクエストボディは {@code resourceId} の有無が異なるため別スキーマとして定義する。
 */
import { z } from "zod";

/**
 * 予約申請フォームの Zod スキーマ（POST /api/reservations 対応）。
 *
 * PUT とは {@code resourceId} の有無が異なるため別スキーマとして定義する。
 * 終了日時 > 開始日時の cross-field バリデーションはフォームコンポーネントと
 * Server Action の両側で実施する（'use server' ファイルでは .refine を使えないため）。
 */
export const CreateReservationSchema = z.object({
  resourceId: z.string().uuid("有効なリソース ID を選択してください"),
  startAt: z.string().min(1, "開始日時は必須です"),
  endAt: z.string().min(1, "終了日時は必須です"),
  purpose: z
    .string()
    .min(1, "利用目的は必須です")
    .max(255, "利用目的は 255 文字以内で入力してください"),
  attendeesCount: z.number().int().positive().nullable().optional(),
});

/**
 * 予約内容更新フォームの Zod スキーマ（PUT /api/reservations/{id} 対応）。
 *
 * {@code resourceId} を含まない（変更不可）。
 */
export const UpdateReservationSchema = z.object({
  startAt: z.string().min(1, "開始日時は必須です"),
  endAt: z.string().min(1, "終了日時は必須です"),
  purpose: z
    .string()
    .min(1, "利用目的は必須です")
    .max(255, "利用目的は 255 文字以内で入力してください"),
  attendeesCount: z.number().int().positive().nullable().optional(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;
