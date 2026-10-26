import { ReservationCsvExportForm } from "./ReservationCsvExportForm";

/**
 * 出力に失敗したときのメッセージ。`error` クエリの値を既知のコードに対応づけ、
 * 未知の値はそのまま画面に出さず汎用メッセージにする。
 */
function errorMessage(error: string | string[] | undefined): string | null {
  const code = Array.isArray(error) ? error[0] : error;
  if (!code) return null;

  switch (code) {
    case "FORBIDDEN":
      return "CSV を出力する権限がありません。";
    case "VALIDATION_ERROR":
      return "出力条件が不正です。開始日と終了日、ステータスを確認してください。";
    default:
      return "CSV の出力に失敗しました。時間をおいて再度お試しください。";
  }
}

/**
 * 帳票出力画面（screen-spec.md §帳票出力 /admin/reports 準拠）。
 *
 * ADMIN 専用（親 admin/layout.tsx でロールガード済み）。
 * 期間とステータスで絞り込んだ予約一覧を CSV としてダウンロードする。
 * 出力に失敗すると Route Handler が `?error=<code>` を付けてこの画面に戻すため、メッセージを表示する。
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const message = errorMessage(sp.error);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">帳票出力</h1>
        <p className="text-sm text-muted-foreground">
          予約一覧を CSV ファイルとしてダウンロードします（全ユーザーの予約が対象です）。
        </p>
      </div>

      {message && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          data-testid="report-error-message"
        >
          {message}
        </p>
      )}

      <ReservationCsvExportForm />
    </div>
  );
}
