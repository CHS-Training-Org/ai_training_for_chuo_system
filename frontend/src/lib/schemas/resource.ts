/**
 * リソースフォームの Zod スキーマ定義（クライアント側バリデーション用）。
 *
 * `'use server'` ファイル（server/actions/resources.ts）からは
 * Zod スキーマオブジェクトを export できないため（Next.js の制約）、
 * このファイルに分離している。
 *
 * 登録（POST）と更新（PUT）でリクエストボディは同一のため、同じスキーマを共用する。
 */
import { z } from 'zod'

/**
 * リソース登録・更新フォームの Zod スキーマ（POST /api/resources・PUT /api/resources/{id} 対応）。
 */
export const CreateResourceSchema = z.object({
  name: z.string().min(1, 'リソース名は必須です').max(100, '100文字以内で入力してください'),
  category: z.enum(['ROOM', 'EQUIPMENT', 'VEHICLE'], { required_error: 'カテゴリは必須です' }),
  capacity: z.number().int().positive().nullable().optional(),
  location: z.string().max(200, '200文字以内で入力してください').optional().nullable(),
  requiresApproval: z.boolean(),
  isActive: z.boolean(),
  description: z.string().optional().nullable(),
})

/**
 * リソース更新フォームの Zod スキーマ（登録と同一のため別名）。
 */
export const UpdateResourceSchema = CreateResourceSchema

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>
