"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UsageFilterFormProps {
  defaultFrom?: string;
  defaultTo?: string;
}

const REPORTS_PATH = "/admin/reports";

/**
 * 利用実績の期間フィルタ（クライアントコンポーネント）。
 *
 * 開始日時・終了日時（datetime-local）を受け取り、URL の searchParams を更新してサーバーコンポーネントに伝える。
 * 送信前に「両方入力、または両方空」「開始日時は終了日時より前」を検証し、違反は画面内のメッセージで止める
 * （遷移しない）。datetime-local の値は同じ書式のため、文字列の大小で前後を比べられる。
 */
export function UsageFilterForm({ defaultFrom, defaultTo }: UsageFilterFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const from = (data.get("from") as string) ?? "";
      const to = (data.get("to") as string) ?? "";

      if ((from === "") !== (to === "")) {
        setError("開始日時と終了日時は両方入力してください。");
        return;
      }
      if (from !== "" && from >= to) {
        setError("開始日時は終了日時より前にしてください。");
        return;
      }

      setError(null);
      if (from === "") {
        router.push(REPORTS_PATH);
        return;
      }
      const params = new URLSearchParams({ from, to });
      router.push(`${REPORTS_PATH}?${params.toString()}`);
    },
    [router],
  );

  const handleReset = useCallback(() => {
    setError(null);
    router.push(REPORTS_PATH);
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">集計期間</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="usage-from">開始日時</Label>
          <Input
            id="usage-from"
            name="from"
            type="datetime-local"
            defaultValue={defaultFrom?.slice(0, 16)}
            data-testid="usage-filter-from-input"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="usage-to">終了日時</Label>
          <Input
            id="usage-to"
            name="to"
            type="datetime-local"
            defaultValue={defaultTo?.slice(0, 16)}
            data-testid="usage-filter-to-input"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="usage-filter-error">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" data-testid="usage-filter-submit">
          集計する
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          data-testid="usage-filter-reset"
        >
          リセット
        </Button>
      </div>
    </form>
  );
}
