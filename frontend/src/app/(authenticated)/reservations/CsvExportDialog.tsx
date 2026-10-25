"use client";

import { useState, useTransition } from "react";
import { exportReservationsCsvAction } from "@/server/actions/reports";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";
import { toast } from "sonner";

/** 選択肢に出すステータス（screen-spec.md §CSV ダウンロードダイアログ の 4 種） */
const EXPORT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

/** 文字列（先頭に BOM を含む）を CSV ファイルとしてブラウザにダウンロードさせる。 */
function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 予約一覧の CSV ダウンロードダイアログ（クライアントコンポーネント・ADMIN のみ表示）。
 *
 * 期間（開始日時・終了日時）とステータス（複数選択）を入力し、Server Action で取得した CSV を
 * Blob にしてダウンロードさせる。入力値の検証は API 側で行い、失敗時はトーストで通知する。
 */
export function CsvExportDialog() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const toggleStatus = (status: string, checked: boolean) => {
    setStatuses((prev) => (checked ? [...prev, status] : prev.filter((s) => s !== status)));
  };

  const handleDownload = () => {
    startTransition(async () => {
      try {
        const { filename, content } = await exportReservationsCsvAction({
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(statuses.length > 0 ? { status: statuses } : {}),
        });
        downloadCsv(filename, content);
        setOpen(false);
      } catch {
        toast.error("CSV のダウンロードに失敗しました。");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="csv-export-open-button">
          CSV ダウンロード
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CSV ダウンロード</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="csv-export-from">開始日時</Label>
              <Input
                id="csv-export-from"
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                data-testid="csv-export-from-input"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="csv-export-to">終了日時</Label>
              <Input
                id="csv-export-to"
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                data-testid="csv-export-to-input"
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">ステータス</legend>
            <div className="flex flex-wrap gap-4">
              {EXPORT_STATUSES.map((status) => (
                <label key={status} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={statuses.includes(status)}
                    onChange={(e) => toggleStatus(status, e.target.checked)}
                    data-testid={`csv-export-status-${status}-checkbox`}
                  />
                  {RESERVATION_STATUS_LABELS[status]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            data-testid="csv-export-cancel-button"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isPending}
            data-testid="csv-export-submit-button"
          >
            {isPending ? "ダウンロード中..." : "ダウンロード"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
