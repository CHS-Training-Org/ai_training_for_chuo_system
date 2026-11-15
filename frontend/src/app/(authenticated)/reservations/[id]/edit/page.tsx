import { notFound } from "next/navigation";
import Link from "next/link";
import { getReservationAction } from "@/server/actions/reservations";
import { getProfileAction } from "@/server/actions/auth";
import { ReservationEditForm } from "./ReservationEditForm";
import { getReservationActions } from "@/lib/reservation-permissions";

/**
 * 予約編集画面（screen-spec.md §予約編集 /reservations/{id}/edit 準拠）。
 *
 * アクセス制御（`getReservationActions` の `canEdit`）:
 * - 承認待ち（PENDING）は、ADMIN を除く申請者本人のみ（ADMIN は PENDING の編集権限なし）。
 * - 下書き（DRAFT）は、ADMIN を含む申請者本人のみ。
 * - それ以外の予約・他人の予約は対象外（notFound で弾く、BE も 422 / 403 を返す）。
 *
 * リソースの変更は不可（api-spec.md PUT /api/reservations/{id} L654 準拠）。
 */
export default async function ReservationEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reservation, profile] = await Promise.all([
    getReservationAction(id),
    getProfileAction().catch(() => null),
  ]);

  const isAdmin = profile?.role === "ADMIN";
  const isOwner = profile?.id === reservation.requesterId;

  const { canEdit } = getReservationActions({ status: reservation.status, isOwner, isAdmin });
  if (!canEdit) {
    notFound();
  }
  const isDraft = reservation.status === "DRAFT";

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/reservations/${reservation.id}`}
        className="text-sm text-primary hover:underline"
      >
        ← 予約詳細に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">予約内容を編集する</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isDraft
            ? "下書きの日時・目的・参加人数を変更できます。「下書き保存」で下書きのまま保存し、「申請する」で正式に申請します。"
            : "承認待ち（PENDING）の予約の日時・目的・参加人数を変更できます。"}
        </p>
      </div>

      <ReservationEditForm
        reservationId={reservation.id}
        status={reservation.status}
        defaultValues={{
          startAt: reservation.startAt,
          endAt: reservation.endAt,
          purpose: reservation.purpose,
          attendeesCount: reservation.attendeesCount,
        }}
        resourceName={reservation.resourceName}
      />
    </div>
  );
}
