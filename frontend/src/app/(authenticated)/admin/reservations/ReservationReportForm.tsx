"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";
import { parseContentDispositionFileName, saveBlob } from "@/lib/download";

/** 絞り込みに使えるステータス（DRAFT はベース実装で未使用のため選択肢に出さない） */
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

const FALLBACK_FILE_NAME = "reservations.csv";
const FALLBACK_ERROR_MESSAGE = "CSV のダウンロードに失敗しました。";

/**
 * 予約帳票（CSV ダウンロード）のフォーム（クライアントコンポーネント）。
 *
 * 期間とステータスを入力し、Route Handler（`/api/reports/reservations/csv`）から CSV を取得して
 * Blob としてダウンロードする。失敗時はダウンロードを開始せず、トーストで通知する。
 */
export function ReservationReportForm() {
  const [downloading, setDownloading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const from = ((data.get("from") as string | null) ?? "").trim();
    const to = ((data.get("to") as string | null) ?? "").trim();
    const statuses = data.getAll("status") as string[];

    // yyyy-MM-dd 同士なので文字列比較で前後関係を判定できる
    if (from && to && from > to) {
      toast.error("開始日は終了日以前の日付にしてください。");
      return;
    }

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    for (const s of statuses) params.append("status", s);
    const query = params.toString();

    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/reservations/csv${query ? `?${query}` : ""}`);
      if (!res.ok) {
        const body: { message?: string } | null = await res.json().catch(() => null);
        toast.error(body?.message ?? FALLBACK_ERROR_MESSAGE);
        return;
      }
      const blob = await res.blob();
      const fileName =
        parseContentDispositionFileName(res.headers.get("Content-Disposition")) ??
        FALLBACK_FILE_NAME;
      saveBlob(blob, fileName);
    } catch {
      toast.error(FALLBACK_ERROR_MESSAGE);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-4 space-y-4"
      data-testid="reservation-report-form"
    >
      <h2 className="text-sm font-semibold">出力条件</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="report-from">開始日</Label>
          <Input
            id="report-from"
            name="from"
            type="date"
            data-testid="reservation-report-from-input"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="report-to">終了日</Label>
          <Input id="report-to" name="to" type="date" data-testid="reservation-report-to-input" />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">ステータス（未選択の場合はすべて）</legend>
        <div className="flex flex-wrap gap-4">
          {STATUS_OPTIONS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="status"
                value={s}
                data-testid={`reservation-report-status-${s}`}
              />
              {RESERVATION_STATUS_LABELS[s] ?? s}
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={downloading} data-testid="reservation-report-submit-button">
        {downloading ? "ダウンロード中…" : "CSV ダウンロード"}
      </Button>
    </form>
  );
}
