/**
 * API レスポンス型定義
 *
 * api-spec.md の権威 DTO に対応した Zod スキーマと TypeScript 型。
 * タイムスタンプは TZ なし ISO 文字列（例: "2025-04-01T09:00:00"）のため
 * z.string().datetime() は使わず z.string() を使用する。
 */
import { z } from "zod";
import {
  ApprovalStatusSchema,
  RecurrenceTypeSchema,
  ReservationStatusSchema,
  ResourceCategorySchema,
  RoleSchema,
} from "./enums";

// ---------------------------------------------------------------------------
// 共通エラー型
// ---------------------------------------------------------------------------

/** API エラーレスポンス（{ code, message }） */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ---------------------------------------------------------------------------
// ページネーションラッパ
// ---------------------------------------------------------------------------

/**
 * Spring Data Page レスポンスのラッパスキーマ
 * 対象: /api/resources, /api/reservations, /api/users
 */
export function paginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    content: z.array(itemSchema),
    totalElements: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    number: z.number().int().nonnegative(),
    size: z.number().int().positive(),
    first: z.boolean(),
    last: z.boolean(),
  });
}
export type Paginated<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

// ---------------------------------------------------------------------------
// UserResponse (api-spec.md §認証)
// ---------------------------------------------------------------------------

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  departmentId: z.string().uuid(),
  departmentName: z.string(),
  createdAt: z.string(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;

// ---------------------------------------------------------------------------
// DepartmentResponse (api-spec.md §ユーザー・部署)
// ---------------------------------------------------------------------------

export const DepartmentResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
});
export type DepartmentResponse = z.infer<typeof DepartmentResponseSchema>;

// ---------------------------------------------------------------------------
// ResourceResponse (api-spec.md §リソース)
// ---------------------------------------------------------------------------

export const ResourceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: ResourceCategorySchema,
  capacity: z.number().int().positive().nullable(),
  location: z.string().nullable(),
  requiresApproval: z.boolean(),
  isActive: z.boolean(),
  description: z.string().nullable(),
  equipment: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});
export type ResourceResponse = z.infer<typeof ResourceResponseSchema>;

/** リソース空き状況スロット（/api/resources/{id}/availability） */
export const AvailabilitySlotSchema = z.object({
  reservationId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
});
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

// ---------------------------------------------------------------------------
// ReservationResponse (api-spec.md §予約)
// ---------------------------------------------------------------------------

export const ReservationResponseSchema = z.object({
  id: z.string().uuid(),
  resourceId: z.string().uuid(),
  resourceName: z.string(),
  requesterId: z.string().uuid(),
  requesterName: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  purpose: z.string(),
  attendeesCount: z.number().int().nonnegative().nullable(),
  status: ReservationStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  // 繰り返し予約（recurring-reservation ユニット）。旧形式のレスポンスでも通るよう省略可能にする。
  /** 繰り返しで作った予約を束ねる ID。繰り返さない予約は null */
  seriesId: z.string().uuid().nullish(),
  recurrenceType: RecurrenceTypeSchema.optional(),
  /** 繰り返しの終了日（yyyy-MM-dd）。繰り返さない予約は null */
  recurrenceUntil: z.string().nullish(),
  /** シリーズ件数（全ステータス）。予約詳細だけが値を返し、それ以外と繰り返さない予約は null */
  seriesCount: z.number().int().nullish(),
  /** 残り回数（この予約より後に始まる同じ系列の件数）。返す条件は seriesCount と同じ */
  remainingCount: z.number().int().nullish(),
});
export type ReservationResponse = z.infer<typeof ReservationResponseSchema>;

// ---------------------------------------------------------------------------
// ApprovalStepResponse (api-spec.md §承認)
// ---------------------------------------------------------------------------

export const ApprovalStepResponseSchema = z.object({
  id: z.string().uuid(),
  reservationId: z.string().uuid(),
  resourceName: z.string(),
  requesterName: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  purpose: z.string(),
  stepOrder: z.number().int().positive(),
  status: ApprovalStatusSchema,
  createdAt: z.string(),
});
export type ApprovalStepResponse = z.infer<typeof ApprovalStepResponseSchema>;

// ---------------------------------------------------------------------------
// 利用実績の集計（api-spec.md §統計 の ResourceUsageResponse）
// ---------------------------------------------------------------------------

export const ResourceUsageResponseSchema = z.object({
  resourceId: z.string().uuid(),
  resourceName: z.string(),
  reservationCount: z.number().int(),
  /** 合計利用時間（分）。 */
  totalMinutes: z.number().int(),
});
export type ResourceUsageResponse = z.infer<typeof ResourceUsageResponseSchema>;
