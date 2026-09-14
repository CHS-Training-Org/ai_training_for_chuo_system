"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * CSV エクスポート操作（期間入力＋ダウンロードリンク）。
 *
 * `/reservations` ページ（ADMIN 表示時）に配置する。期間入力値をクライアント側の state で保持し、
 * ダウンロードリンクの href に反映する（Docs/spec/aidlc-docs/construction/csv-export/functional-design/frontend-components.md 準拠）。
 */

export interface CsvExportControlsProps {
  initialFrom?: string;
  initialTo?: string;
  statuses: string[];
}

/**
 * datetime-local 入力値（"2026-09-09T10:00" 16文字）を
 * BE が期待する秒付き ISO 文字列（"2026-09-09T10:00:00" 19文字）に正規化する。
 */
function toIsoWithSeconds(value: string): string {
  if (value.length === 16) return `${value}:00`;
  return value;
}

export function CsvExportControls({ initialFrom, initialTo, statuses }: CsvExportControlsProps) {
  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");

  const isValid = (from === "" && to === "") || (from !== "" && to !== "");

  let downloadHref: string | undefined;
  if (isValid) {
    const params = new URLSearchParams();
    for (const status of statuses) {
      params.append("status", status);
    }
    if (from !== "") params.set("from", toIsoWithSeconds(from));
    if (to !== "") params.set("to", toIsoWithSeconds(to));
    const query = params.toString();
    downloadHref = `/api/reports/reservations/csv${query ? `?${query}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="csv-export-from" className="text-xs text-muted-foreground">
          開始日時
        </label>
        <Input
          id="csv-export-from"
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          data-testid="csv-export-from-input"
          className="h-9 w-auto"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="csv-export-to" className="text-xs text-muted-foreground">
          終了日時
        </label>
        <Input
          id="csv-export-to"
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          data-testid="csv-export-to-input"
          className="h-9 w-auto"
        />
      </div>
      <Button asChild variant="outline" disabled={!isValid}>
        <a
          href={isValid ? downloadHref : undefined}
          aria-disabled={!isValid}
          onClick={(e) => {
            if (!isValid) e.preventDefault();
          }}
          data-testid="csv-export-download-link"
        >
          CSV ダウンロード
        </a>
      </Button>
    </div>
  );
}
