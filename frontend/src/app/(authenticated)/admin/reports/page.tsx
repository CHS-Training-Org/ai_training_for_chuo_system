import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";

/**
 * ダウンロード失敗時に表示してよいエラーコードと日本語メッセージ（許可リスト）。
 * `error` クエリは外部から任意の値が渡せるため、ここに無い値は汎用メッセージにし、値そのものは画面に出さない。
 */
const REPORT_ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "期間の指定が正しくありません。開始日時は終了日時より前にしてください。",
  UNAUTHORIZED: "ログインの有効期限が切れています。再度サインインしてください。",
  FORBIDDEN: "この操作を行う権限がありません。",
  INTERNAL_SERVER_ERROR: "サーバーでエラーが発生しました。時間をおいて再度お試しください。",
};
const GENERIC_ERROR_MESSAGE = "CSV のダウンロードに失敗しました。時間をおいて再度お試しください。";

function errorMessageOf(error: string | string[] | undefined): string | null {
  if (error === undefined) return null;
  const code = Array.isArray(error) ? error[0] : error;
  return Object.hasOwn(REPORT_ERROR_MESSAGES, code)
    ? REPORT_ERROR_MESSAGES[code]
    : GENERIC_ERROR_MESSAGE;
}

/**
 * 帳票出力画面（screen-spec.md §帳票 `/admin/reports` 準拠）。
 *
 * ADMIN 専用（親 admin/layout.tsx でロールガード済み）。クライアント JavaScript を使わない通常の
 * GET フォームで、送信先の Route Handler が BE の CSV を中継してブラウザにダウンロードさせる。
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const errorMessage = errorMessageOf(sp.error);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">帳票出力</h1>
        <p className="text-sm text-muted-foreground">
          全ユーザーの予約を CSV でダウンロードします。条件を指定しない場合は全件が対象です。
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          data-testid="reports-error-alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <form
        method="GET"
        action="/api/reports/reservations/csv"
        data-testid="reports-form"
        className="max-w-xl space-y-6"
      >
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">期間（予約の開始日時）</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reports-from">開始日時</Label>
              <Input
                id="reports-from"
                name="from"
                type="datetime-local"
                data-testid="reports-from-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reports-to">終了日時</Label>
              <Input
                id="reports-to"
                name="to"
                type="datetime-local"
                data-testid="reports-to-input"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            終了日時は含みません（開始日時が期間内の予約を出力）。どちらも空欄にできます。
          </p>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">ステータス</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="status"
                  value={value}
                  data-testid={`reports-status-${value}`}
                  className="size-4"
                />
                {label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            何も選ばない場合は全ステータスが対象です。
          </p>
        </fieldset>

        <Button type="submit" data-testid="reports-download-button">
          CSV ダウンロード
        </Button>
      </form>
    </div>
  );
}
