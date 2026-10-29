import { ReservationReportForm } from "./ReservationReportForm";

/**
 * 予約帳票画面（screen-spec.md §予約帳票 /admin/reservations 準拠）。
 *
 * ADMIN 専用（親 admin/layout.tsx でロールガード済み）。
 * 期間とステータスで絞り込んだ予約一覧を CSV でダウンロードする。
 */
export default function AdminReservationReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">予約帳票</h1>
        <p className="text-sm text-muted-foreground">
          予約一覧を CSV ファイルでダウンロードします。期間は予約の利用開始日で絞り込みます。
        </p>
      </div>

      <ReservationReportForm />
    </div>
  );
}
