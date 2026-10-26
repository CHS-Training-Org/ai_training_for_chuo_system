"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";

/** 画面で選べるステータス（DRAFT はベース実装で発生しないため出さない）。 */
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

/** フォームの送信先（JWT を付けて backend へ中継する Route Handler）。 */
const CSV_ACTION = "/api/reports/reservations/csv";

/**
 * 予約 CSV の出力フォーム（クライアントコンポーネント。screen-spec.md §帳票出力 /admin/reports 準拠）。
 *
 * 期間（開始日・終了日）とステータスを GET フォームとして `/api/reports/reservations/csv`
 * （Route Handler）へ送り、ブラウザ標準のダウンロードにする。JWT はサーバー側で付与される。
 *
 * 開始日が終了日より後のときは送信せずメッセージを出す。これは早く気づかせるための補助で、
 * backend も同じ条件を 400 で拒否する。
 */
export function ReservationCsvExportForm() {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const from = String(data.get("from") ?? "");
    const to = String(data.get("to") ?? "");

    // YYYY-MM-DD 形式の文字列は辞書順が日付順と一致する
    if (from && to && from > to) {
      e.preventDefault();
      setError("開始日は終了日以前の日付を指定してください。");
      return;
    }
    setError(null);
  }

  return (
    <form
      method="get"
      action={CSV_ACTION}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-4"
      data-testid="report-form"
    >
      <h2 className="text-sm font-semibold">予約一覧の CSV 出力</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="report-from">開始日</Label>
          <Input id="report-from" name="from" type="date" data-testid="report-from-input" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-to">終了日</Label>
          <Input id="report-to" name="to" type="date" data-testid="report-to-input" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        開始日時が期間内（終了日の日を含む）の予約が対象です。どちらも未入力なら期間で絞りません。
      </p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">ステータス</legend>
        <div className="flex flex-wrap gap-4">
          {STATUS_OPTIONS.map((status) => (
            <label key={status} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="status"
                value={status}
                className="h-4 w-4"
                data-testid={`report-status-${status}`}
              />
              {RESERVATION_STATUS_LABELS[status]}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          1 つも選ばなければ、すべてのステータスが対象です。
        </p>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="report-form-error">
          {error}
        </p>
      )}

      <Button type="submit" data-testid="report-submit-button">
        CSV ダウンロード
      </Button>
    </form>
  );
}
