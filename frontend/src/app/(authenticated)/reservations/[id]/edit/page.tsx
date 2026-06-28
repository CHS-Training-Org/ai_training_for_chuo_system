import { notFound } from "next/navigation";
import Link from "next/link";
import { getReservationAction } from "@/server/actions/reservations";
import { getProfileAction } from "@/server/actions/auth";
import { ReservationEditForm } from "./ReservationEditForm";

/**
 * 予約編集画面（screen-spec.md §予約編集 /reservations/{id}/edit 準拠）。
 *
 * アクセス制御:
 * - 申請者本人（MEMBER / APPROVER）のみ閲覧可（ADMIN は PUT 権限なし）。
 * - PENDING 以外の予約は編集対象外（notFound で弾く、BE も 422 を返す）。
 * - 他人の予約は BE が 403 → エラー画面。
 *
 * リソースの変更は不可（api-spec.md PUT /api/reservations/{id} L654 準拠）。
 */
export default async function ReservationEditPage({
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

  // ADMIN は PUT 権限なし（権限マトリクス L108）、他人の予約・PENDING 以外は対象外
  if (isAdmin || !isOwner || reservation.status !== "PENDING") {
    notFound();
  }

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
          承認待ち（PENDING）の予約の日時・目的・参加人数を変更できます。
        </p>
      </div>

      <ReservationEditForm
        reservationId={reservation.id}
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
