import { z } from "zod";

/** ユーザーロール */
export const RoleSchema = z.enum(["MEMBER", "APPROVER", "ADMIN"]);
export type Role = z.infer<typeof RoleSchema>;

/** リソースカテゴリ */
export const ResourceCategorySchema = z.enum(["ROOM", "EQUIPMENT", "VEHICLE"]);
export type ResourceCategory = z.infer<typeof ResourceCategorySchema>;

/** 予約ステータス */
export const ReservationStatusSchema = z.enum([
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

/** 繰り返しの種別（NONE = 繰り返さない） */
export const RecurrenceTypeSchema = z.enum(["NONE", "WEEKLY", "MONTHLY"]);
export type RecurrenceType = z.infer<typeof RecurrenceTypeSchema>;

/** 承認ステップステータス */
export const ApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
