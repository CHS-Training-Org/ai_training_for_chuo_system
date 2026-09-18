"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";
import { ApiClientError } from "@/lib/api-client";
import {
  buildCsvDownloadUrl,
  parseFilenameFromContentDisposition,
  triggerBrowserDownload,
} from "@/lib/reports";

const STATUS_OPTIONS = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;

/**
 * 帳票出力の絞り込み UI とダウンロードボタン（クライアントコンポーネント）。
 *
 * `ResourceFilterForm` のカード枠・グリッド構成を踏襲するが、URL の searchParams には
 * 往復させない（このページはサーバー取得データを持たず、URL に載せる必要がないうえ、
 * 往復にすると入力直後にダウンロードを押したとき1つ前の条件で落ちる競合が生まれるため）。
 */
export function ReportExportClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const handleDownload = () => {
    startTransition(async () => {
      try {
        const res = await fetch(buildCsvDownloadUrl({ from, to, status }), {
          cache: "no-store",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new ApiClientError(
            body.code ?? `HTTP_${res.status}`,
            body.message ?? res.statusText,
            res.status,
          );
        }

        const filename = parseFilenameFromContentDisposition(
          res.headers.get("content-disposition"),
          "reservations.csv",
        );
        triggerBrowserDownload(await res.blob(), filename);
        toast.success("CSV をダウンロードしました。");
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 403) {
          toast.error("この操作は管理者のみ実行できます。");
        } else if (err instanceof ApiClientError && err.status === 401) {
          toast.error("セッションの有効期限が切れました。再度ログインしてください。");
        } else {
          toast.error("CSV のダウンロードに失敗しました。時間をおいて再度お試しください。");
        }
      }
    });
  };

  const handleReset = () => {
    setFrom("");
    setTo("");
    setStatus("ALL");
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold">絞り込み</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="report-from">開始日</Label>
          <Input
            id="report-from"
            type="date"
            data-testid="report-from-input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="report-to">終了日</Label>
          <Input
            id="report-to"
            type="date"
            data-testid="report-to-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="report-status">承認ステータス</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="report-status" data-testid="report-status-select">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">すべて</SelectItem>
              {STATUS_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {RESERVATION_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        未入力の場合は全期間が対象です。終了日は当日の 23:59:59 まで含みます。
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          data-testid="report-download-button"
          onClick={handleDownload}
        >
          {isPending ? "生成中..." : "CSV ダウンロード"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          data-testid="report-reset-button"
          onClick={handleReset}
        >
          リセット
        </Button>
      </div>
    </div>
  );
}
