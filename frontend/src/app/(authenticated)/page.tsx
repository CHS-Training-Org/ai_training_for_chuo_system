import Link from 'next/link'
import { getProfileAction } from '@/server/actions/auth'
import { listReservationsAction } from '@/server/actions/reservations'
import { listPendingApprovalsAction } from '@/server/actions/approvals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * ダッシュボード画面（screen-spec.md §ダッシュボード 準拠）。
 *
 * 全ロール（MEMBER / APPROVER / ADMIN）が参照可能。
 * `api-spec.md §ユーザー・部署 シーケンス図（par 構文）` に従い、
 * マイ予約 PENDING / APPROVED 件数を Promise.all で並行取得する。
 * APPROVER / ADMIN は追加で承認待ち件数も表示する。
 */
export default async function DashboardPage() {
  // ロール確認（APPROVER / ADMIN 判定に使用）
  let role = 'MEMBER'
  try {
    const profile = await getProfileAction()
    role = profile.role
  } catch {
    // 認証ガードレイアウトで処理済み。ここでは MEMBER として扱う
  }

  // マイ予約 PENDING / APPROVED 件数を並行取得（api-spec.md par 構文）
  const [pendingReservations, approvedReservations] = await Promise.all([
    listReservationsAction({ status: ['PENDING'] }).catch(() => ({ totalElements: 0 })),
    listReservationsAction({ status: ['APPROVED'] }).catch(() => ({ totalElements: 0 })),
  ])

  // APPROVER / ADMIN のみ承認待ち件数を取得（api-spec.md opt 構文）
  let pendingApprovalCount = 0
  if (role === 'APPROVER' || role === 'ADMIN') {
    try {
      const pendingApprovals = await listPendingApprovalsAction()
      pendingApprovalCount = pendingApprovals.length
    } catch {
      pendingApprovalCount = 0
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">BookFlow 施設・備品予約システムへようこそ</p>
      </div>

      {/* サマリカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* マイ予約 PENDING 件数 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              承認待ち予約
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingReservations.totalElements}</p>
            <p className="text-xs text-muted-foreground mt-1">件</p>
          </CardContent>
        </Card>

        {/* マイ予約 APPROVED 件数 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              承認済み予約
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{approvedReservations.totalElements}</p>
            <p className="text-xs text-muted-foreground mt-1">件</p>
          </CardContent>
        </Card>

        {/* 承認待ち件数（APPROVER / ADMIN のみ） */}
        {(role === 'APPROVER' || role === 'ADMIN') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                担当の承認待ち
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendingApprovalCount}</p>
              <p className="text-xs text-muted-foreground mt-1">件</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* クイックアクション */}
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/reservations/new">予約を申請する</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reservations">マイ予約を見る</Link>
        </Button>
      </div>
    </div>
  )
}
