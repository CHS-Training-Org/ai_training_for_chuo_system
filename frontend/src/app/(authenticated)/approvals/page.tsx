import { getProfileAction } from '@/server/actions/auth'
import { listPendingApprovalsAction } from '@/server/actions/approvals'
import type { ApprovalStepResponse } from '@/lib/types/api'
import { ApprovalTable } from './ApprovalTable'

/**
 * 承認待ち一覧ページ（APPROVER / ADMIN 限定）。
 *
 * screen-spec.md §承認 準拠。
 * MEMBER がアクセスした場合は 403 画面を表示（リダイレクトしない）。
 */
export default async function ApprovalsPage() {
  // ロール確認（APPROVER / ADMIN のみアクセス可）
  let isApproverOrAdmin = false
  try {
    const profile = await getProfileAction()
    isApproverOrAdmin = profile.role === 'APPROVER' || profile.role === 'ADMIN'
  } catch {
    isApproverOrAdmin = false
  }

  if (!isApproverOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-6xl font-bold text-muted-foreground">403</p>
        <p className="text-xl font-semibold">アクセス権限がありません</p>
        <p className="text-muted-foreground">このページは承認者（APPROVER）または管理者（ADMIN）専用です。</p>
      </div>
    )
  }

  // 承認待ちステップ取得（エラー時は空配列として扱う）
  let steps: ApprovalStepResponse[] = []
  try {
    steps = await listPendingApprovalsAction()
  } catch {
    steps = []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">承認待ち一覧</h1>
        <p className="text-sm text-muted-foreground">
          承認待ちの予約申請を確認し、承認または却下してください。
        </p>
      </div>

      <ApprovalTable steps={steps} />
    </div>
  )
}
