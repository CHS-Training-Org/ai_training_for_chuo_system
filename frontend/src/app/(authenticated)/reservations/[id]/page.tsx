import Link from 'next/link'
import { getReservationAction } from '@/server/actions/reservations'
import { getProfileAction } from '@/server/actions/auth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CancelButton } from './CancelButton'

/**
 * 予約詳細画面（screen-spec.md §予約詳細 /reservations/{id} 準拠）。
 *
 * MEMBER は本人の予約のみ閲覧可（他人の予約は BE が 403 → エラー画面）。
 * PENDING/APPROVED 状態のみキャンセルボタンを表示（本人 or ADMIN）。
 * 承認ステップの表示はカテゴリ 6（ApprovalStepResponse）で実装。
 */

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'ドラフト',
  PENDING: '承認待ち',
  APPROVED: '確定',
  REJECTED: '却下',
  CANCELLED: 'キャンセル',
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'text-muted-foreground',
    DRAFT: 'text-muted-foreground',
  }
  return map[status] ?? ''
}

const CANCELLABLE_STATUSES = ['PENDING', 'APPROVED']

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [reservation, profile] = await Promise.all([
    getReservationAction(id),
    getProfileAction().catch(() => null),
  ])

  const isAdmin = profile?.role === 'ADMIN'
  const isOwner = profile?.id === reservation.requesterId
  const canCancel = CANCELLABLE_STATUSES.includes(reservation.status) && (isOwner || isAdmin)

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/reservations" className="text-sm text-primary hover:underline">
        ← 予約一覧に戻る
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">予約詳細</h1>
        <Badge className={statusBadgeClass(reservation.status)}>
          {STATUS_LABELS[reservation.status] ?? reservation.status}
        </Badge>
      </div>

      {/* 予約情報 */}
      <Card>
        <CardHeader>
          <CardTitle>{reservation.resourceName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="font-medium text-muted-foreground">申請者</dt>
            <dd>{reservation.requesterName}</dd>

            <dt className="font-medium text-muted-foreground">開始日時</dt>
            <dd>{new Date(reservation.startAt).toLocaleString('ja-JP')}</dd>

            <dt className="font-medium text-muted-foreground">終了日時</dt>
            <dd>{new Date(reservation.endAt).toLocaleString('ja-JP')}</dd>

            <dt className="font-medium text-muted-foreground">利用目的</dt>
            <dd>{reservation.purpose}</dd>

            {reservation.attendeesCount != null && (
              <>
                <dt className="font-medium text-muted-foreground">参加人数</dt>
                <dd>{reservation.attendeesCount} 名</dd>
              </>
            )}

            <dt className="font-medium text-muted-foreground">申請日時</dt>
            <dd>{new Date(reservation.createdAt).toLocaleString('ja-JP')}</dd>

            <dt className="font-medium text-muted-foreground">更新日時</dt>
            <dd>{new Date(reservation.updatedAt).toLocaleString('ja-JP')}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* キャンセルボタン（PENDING/APPROVED・本人 or ADMIN のみ） */}
      {canCancel && <CancelButton reservationId={reservation.id} />}

      {/* カテゴリ 6 TODO: 承認ステップ表示（ApprovalStepResponse） */}
    </div>
  )
}
