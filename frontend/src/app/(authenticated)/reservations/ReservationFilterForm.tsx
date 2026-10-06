"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReservationFilterFormProps {
  defaultResourceName?: string;
  defaultFrom?: string;
  defaultTo?: string;
}

/**
 * 予約一覧のフィルタフォーム（クライアントコンポーネント）。
 *
 * リソース名検索・期間フィルタの入力を受け取り、URL の searchParams を更新してサーバーコンポーネントに伝える。
 * ステータスタブ（Link ベース、別コンポーネント）とは独立しているため、送信時は現在選択中の status を
 * searchParams から読み取って転記する（失わないようにする）。一方リセット時は US-04 のとおり
 * すべてのフィルタ（status を含む）を解除し、既定の表示（ステータスタブ「すべて」相当）に戻す。
 */
export function ReservationFilterForm({
  defaultResourceName,
  defaultFrom,
  defaultTo,
}: ReservationFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      const params = new URLSearchParams();

      const currentStatus = searchParams.getAll("status");
      for (const s of currentStatus) params.append("status", s);

      const resourceName = (data.get("resourceName") as string).trim();
      const from = data.get("from") as string;
      const to = data.get("to") as string;

      if (resourceName) params.set("resourceName", resourceName);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      router.push(`/reservations?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleReset = useCallback(() => {
    router.push("/reservations");
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold">リソース名・期間で絞り込む</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* リソース名 */}
        <div className="space-y-1">
          <Label htmlFor="resourceName">リソース名</Label>
          <Input
            id="resourceName"
            name="resourceName"
            type="text"
            placeholder="リソース名で検索"
            defaultValue={defaultResourceName}
            data-testid="reservation-filter-form-resource-name-input"
          />
        </div>

        {/* 開始日時 */}
        <div className="space-y-1">
          <Label htmlFor="from">開始日時</Label>
          <Input
            id="from"
            name="from"
            type="datetime-local"
            defaultValue={defaultFrom?.slice(0, 16)}
            data-testid="reservation-filter-form-from-input"
          />
        </div>

        {/* 終了日時 */}
        <div className="space-y-1">
          <Label htmlFor="to">終了日時</Label>
          <Input
            id="to"
            name="to"
            type="datetime-local"
            defaultValue={defaultTo?.slice(0, 16)}
            data-testid="reservation-filter-form-to-input"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          絞り込む
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleReset}>
          リセット
        </Button>
      </div>
    </form>
  );
}
