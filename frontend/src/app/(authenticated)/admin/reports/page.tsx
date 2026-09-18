import { ReportExportClient } from "./ReportExportClient";

/**
 * 帳票出力画面（screen-spec.md §帳票出力 /admin/reports 準拠）。
 *
 * ADMIN 専用（親 admin/layout.tsx でロールガード済み）。
 * サーバー取得データを持たないため、見出しとクライアントコンポーネントの描画のみを担う。
 */
export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">帳票出力</h1>
        <p className="text-sm text-muted-foreground">
          予約データを CSV 形式でダウンロードします（管理者専用）。
        </p>
      </div>

      <ReportExportClient />
    </div>
  );
}
