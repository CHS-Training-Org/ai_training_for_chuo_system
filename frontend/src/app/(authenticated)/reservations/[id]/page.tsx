import Link from "next/link";
import { getReservationAction } from "@/server/actions/reservations";
import { getProfileAction } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CancelButton } from "./CancelButton";
import { RECURRENCE_TYPE_LABELS, RESERVATION_STATUS_LABELS } from "@/lib/labels";

/**
 * 予約詳細画面（screen-spec.md §予約詳細 /reservations/{id} 準拠）。
 *
 * MEMBER は本人の予約のみ閲覧可（他人の予約は BE が 403 → エラー画面）。DRAFT は APPROVER でも
 * 本人以外は閲覧不可（BE が 403）。
 * PENDING/DRAFT のみ編集ボタンを表示（本人のみ、ADMIN は不可）。DRAFT の場合は編集画面で
 * 正式申請も行える（reservation-draft ユニット）。
 * DRAFT/PENDING/APPROVED 状態のみキャンセルボタンを表示（本人 or ADMIN）。DRAFT のキャンセルは
 * 下書きの削除に相当する。
 * 承認ステップの表示はカテゴリ 6（ApprovalStepResponse）で実装。
 * 繰り返しで作った予約（recurrenceType が NONE 以外）には、シリーズ情報（種別・終了日・シリーズ件数・
 * 残り回数）を表示する（recurring-reservation ユニット）。繰り返さない予約と旧形式のレスポンスでは出さない。
 */

const STATUS_LABELS = RESERVATION_STATUS_LABELS;

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "text-muted-foreground",
    DRAFT: "text-muted-foreground",
  };
  return map[status] ?? "";
}

const CANCELLABLE_STATUSES = ["DRAFT", "PENDING", "APPROVED"];

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [reservation, profile] = await Promise.all([
    getReservationAction(id),
    getProfileAction().catch(() => null),
  ]);

  const isAdmin = profile?.role === "ADMIN";
  const isOwner = profile?.id === reservation.requesterId;
  // 編集可能条件: PENDING または DRAFT かつ本人（ADMIN は PUT 権限なし: api-spec.md §権限マトリクス L108）
  const canEdit =
    (reservation.status === "PENDING" || reservation.status === "DRAFT") && isOwner && !isAdmin;
  const canCancel = CANCELLABLE_STATUSES.includes(reservation.status) && (isOwner || isAdmin);
  // 繰り返しで作った予約だけ、シリーズ情報を出す（NONE と、項目がない旧形式のレスポンスでは出さない）
  const isSeries = !!reservation.recurrenceType && reservation.recurrenceType !== "NONE";

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
            <dd>{new Date(reservation.startAt).toLocaleString("ja-JP")}</dd>

            <dt className="font-medium text-muted-foreground">終了日時</dt>
            <dd>{new Date(reservation.endAt).toLocaleString("ja-JP")}</dd>

            <dt className="font-medium text-muted-foreground">利用目的</dt>
            <dd>{reservation.purpose}</dd>

            {reservation.attendeesCount != null && (
              <>
                <dt className="font-medium text-muted-foreground">参加人数</dt>
                <dd>{reservation.attendeesCount} 名</dd>
              </>
            )}

            <dt className="font-medium text-muted-foreground">申請日時</dt>
            <dd>{new Date(reservation.createdAt).toLocaleString("ja-JP")}</dd>

            {isSeries && (
              <>
                <dt className="font-medium text-muted-foreground">繰り返し</dt>
                <dd data-testid="reservation-detail-recurrence-type">
                  {RECURRENCE_TYPE_LABELS[reservation.recurrenceType!] ??
                    reservation.recurrenceType}
                </dd>

                {reservation.recurrenceUntil && (
                  <>
                    <dt className="font-medium text-muted-foreground">繰り返し終了日</dt>
                    {/* yyyy-MM-dd を Date に通すとタイムゾーンで日がずれうるため、文字列のまま整形する */}
                    <dd data-testid="reservation-detail-recurrence-until">
                      {reservation.recurrenceUntil.replaceAll("-", "/")}
                    </dd>
                  </>
                )}

                {reservation.seriesCount != null && (
                  <>
                    <dt className="font-medium text-muted-foreground">シリーズ件数</dt>
                    <dd data-testid="reservation-detail-series-count">
                      {reservation.seriesCount} 件
                    </dd>
                  </>
                )}

                {reservation.remainingCount != null && (
                  <>
                    <dt className="font-medium text-muted-foreground">残り回数</dt>
                    <dd data-testid="reservation-detail-remaining-count">
                      {reservation.remainingCount} 回
                    </dd>
                  </>
                )}
              </>
            )}

            <dt className="font-medium text-muted-foreground">更新日時</dt>
            <dd>{new Date(reservation.updatedAt).toLocaleString("ja-JP")}</dd>
          </dl>
        </CardContent>
      </Card>

      {/* 編集ボタン（PENDING/DRAFT・本人のみ。DRAFT の場合は編集画面で正式申請も行える） */}
      {canEdit && (
        <Button asChild variant="outline">
          <Link href={`/reservations/${reservation.id}/edit`}>予約内容を編集する</Link>
        </Button>
      )}

      {/* キャンセルボタン（DRAFT/PENDING/APPROVED・本人 or ADMIN のみ。DRAFT は下書きの削除に相当） */}
      {canCancel && <CancelButton reservationId={reservation.id} />}

      {/* カテゴリ 6 TODO: 承認ステップ表示（ApprovalStepResponse） */}
    </div>
  );
}
