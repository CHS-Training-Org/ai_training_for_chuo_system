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
import { RecurrenceTypeSchema } from "@/lib/types/enums";

/**
 * 予約申請フォームの Zod スキーマ（POST /api/reservations 対応）。
 *
 * PUT とは {@code resourceId} の有無が異なるため別スキーマとして定義する。
 * cross-field バリデーション（終了日時 > 開始日時、繰り返し終了日）は
 * {@link CreateReservationFormSchema}（クライアント側）で実施する
 * （'use server' ファイルでは .refine を使えないため、Server Action では検証しない）。
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
  /** 下書き保存オプション（reservation-draft ユニット）。省略時は false（通常の申請）。 */
  draft: z.boolean().optional(),
  /** 繰り返しの種別（recurring-reservation ユニット）。省略時は NONE（繰り返さない）。 */
  recurrenceType: RecurrenceTypeSchema.optional(),
  /** 繰り返しの終了日（yyyy-MM-dd）。WEEKLY / MONTHLY で必須。NONE では API に送らない。 */
  recurrenceUntil: z.string().nullable().optional(),
});

/**
 * 予約申請フォームの検証スキーマ（クライアント側。{@link CreateReservationSchema} に cross-field の検証を足したもの）。
 *
 * - 終了日時は開始日時より後
 * - 繰り返し（毎週・毎月）では終了日が必須
 * - 繰り返しの終了日は開始日時の日付以降（同じ日は有効で、1 件だけ登録される）
 */
export const CreateReservationFormSchema = CreateReservationSchema.refine(
  (data) => !data.startAt || !data.endAt || data.endAt > data.startAt,
  { message: "終了日時は開始日時より後に設定してください", path: ["endAt"] },
)
  .refine(
    (data) => !data.recurrenceType || data.recurrenceType === "NONE" || !!data.recurrenceUntil,
    { message: "繰り返し終了日は必須です", path: ["recurrenceUntil"] },
  )
  .refine(
    (data) => {
      if (!data.recurrenceType || data.recurrenceType === "NONE") return true;
      if (!data.recurrenceUntil || !data.startAt) return true;
      // datetime-local は "YYYY-MM-DDTHH:mm"。先頭 10 文字が日付で、yyyy-MM-dd 同士は文字列比較で足りる
      return data.recurrenceUntil >= data.startAt.slice(0, 10);
    },
    { message: "繰り返し終了日は開始日以降にしてください", path: ["recurrenceUntil"] },
  );

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
  /** 下書きの正式申請オプション（reservation-draft ユニット）。DRAFT 以外では無視される。 */
  submit: z.boolean().optional(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type CreateReservationFormValues = z.infer<typeof CreateReservationFormSchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationSchema>;
