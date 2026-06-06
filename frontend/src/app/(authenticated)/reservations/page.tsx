import Link from 'next/link'
import { listReservationsAction } from '@/server/actions/reservations'
import { getProfileAction } from '@/server/actions/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaginationNav } from '@/components/ui/pagination-nav'

/**
 * マイ予約一覧画面（screen-spec.md §マイ予約 /reservations 準拠）。
 *
 * MEMBER は本人の予約のみ、ADMIN は全件表示（BE 側でロール判定）。
 * URL searchParams の status でフィルタ可能（複数値 ?status=PENDING&status=APPROVED）。
 * page でページ遷移（0 始まり）。status フィルタは引き継ぐ。
 */

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'ドラフト',
  PENDING: '承認待ち',
  APPROVED: '確定',
  REJECTED: '却下',
  CANCELLED: 'キャンセル',
}

const STATUS_VARIANTS = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
  DRAFT: 'outline',
} as const

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

const ALL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawStatus = sp.status
  const selectedStatuses = rawStatus
    ? Array.isArray(rawStatus)
      ? rawStatus
      : [rawStatus]
    : []
  const page = Number(sp.page ?? 0)

  const [reservations, profile] = await Promise.all([
    listReservationsAction({
      ...(selectedStatuses.length > 0 ? { status: selectedStatuses } : {}),
      page,
    }),
    getProfileAction().catch(() => null),
  ])

  const isAdmin = profile?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? '全予約一覧' : 'マイ予約'}
          </h1>
          <p className="text-sm text-muted-foreground">全 {reservations.totalElements} 件</p>
        </div>
        <Button asChild>
          <Link href="/resources">リソースを探す</Link>
        </Button>
      </div>

      {/* ステータスフィルタタブ */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/reservations"
          className={`rounded-full px-3 py-1 text-sm border transition-colors ${
            selectedStatuses.length === 0
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:bg-muted'
          }`}
        >
          すべて
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/reservations?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm border transition-colors ${
              selectedStatuses.includes(s)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            {STATUS_LABELS[s] ?? s}
          </Link>
        ))}
      </div>

      {/* 予約一覧テーブル */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>リソース名</TableHead>
            {isAdmin && <TableHead>申請者</TableHead>}
            <TableHead>開始日時</TableHead>
            <TableHead>終了日時</TableHead>
            <TableHead>利用目的</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.content.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell className="font-medium">{reservation.resourceName}</TableCell>
              {isAdmin && <TableCell>{reservation.requesterName}</TableCell>}
              <TableCell className="text-sm">
                {new Date(reservation.startAt).toLocaleString('ja-JP')}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(reservation.endAt).toLocaleString('ja-JP')}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{reservation.purpose}</TableCell>
              <TableCell>
                <Badge
                  variant={STATUS_VARIANTS[reservation.status as keyof typeof STATUS_VARIANTS] ?? 'secondary'}
                  className={statusBadgeClass(reservation.status)}
                >
                  {STATUS_LABELS[reservation.status] ?? reservation.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/reservations/${reservation.id}`}>詳細</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {reservations.content.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={isAdmin ? 7 : 6}
                className="text-center text-muted-foreground py-8"
              >
                予約がありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <PaginationNav
        page={reservations.number}
        totalPages={reservations.totalPages}
        first={reservations.first}
        last={reservations.last}
        totalElements={reservations.totalElements}
        basePath="/reservations"
        query={sp}
      />
    </div>
  )
}
