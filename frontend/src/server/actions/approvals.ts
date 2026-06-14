"use server";

import { createApiClient } from "@/lib/api-client";
import { ApprovalStepResponseSchema, type ApprovalStepResponse } from "@/lib/types/api";
import { getAccessToken } from "@/lib/session";

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * 承認待ちステップ一覧を取得する（ページネーションなし・全件配列）。
 *
 * APPROVER は自分担当（`approver_id = 自分`）の PENDING ステップのみ。ADMIN は全件。
 * MEMBER は 403 Forbidden（`ApiClientError` としてスロー）。
 *
 * `api-spec.md` L94 に従いページネーションなし（bare array）。`getArray` を使用する。
 */
export async function listPendingApprovalsAction(): Promise<ApprovalStepResponse[]> {
  const client = createApiClient(getAccessToken);
  return client.getArray("/approvals/pending", ApprovalStepResponseSchema);
}

/**
 * 承認操作を行う（`PENDING → APPROVED`）。
 *
 * コメントは任意。重複再チェックあり（競合 → `ApiClientError(code='RESERVATION_CONFLICT')`）。
 * 決済済みステップへの再操作は `ApiClientError(code='APPROVAL_ALREADY_DECIDED', status=422)`。
 *
 * @param stepId 承認ステップ ID（`approval_steps.id`）
 * @param comment 承認コメント（任意）
 */
export async function approveAction(
  stepId: string,
  comment?: string,
): Promise<ApprovalStepResponse> {
  const client = createApiClient(getAccessToken);
  const body: Record<string, string | null> = { comment: comment ?? null };
  return client.post(`/approvals/${stepId}/approve`, body, ApprovalStepResponseSchema);
}

/**
 * 却下操作を行う（`PENDING → REJECTED`）。
 *
 * コメントは必須（欠落または空の場合は BE が 400 `COMMENT_REQUIRED` を返す）。
 * UI 側でもバリデーションを行い、400 は BE 最終防衛として扱う。
 *
 * @param stepId 承認ステップ ID（`approval_steps.id`）
 * @param comment 却下コメント（必須）
 */
export async function rejectAction(stepId: string, comment: string): Promise<ApprovalStepResponse> {
  const client = createApiClient(getAccessToken);
  return client.post(`/approvals/${stepId}/reject`, { comment }, ApprovalStepResponseSchema);
}
