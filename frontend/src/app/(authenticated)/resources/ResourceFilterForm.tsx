"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
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
import { RESOURCE_CATEGORY_LABELS } from "@/lib/labels";

interface ResourceFilterFormProps {
  defaultCategory?: string;
  defaultFrom?: string;
  defaultTo?: string;
  defaultKeyword?: string;
}

/**
 * フォームの入力値から URL クエリパラメータを組み立てる純関数。
 *
 * `pagination-nav.tsx` の `buildHref` と同じ方針で、DOM を介さずテストできるように
 * URL 組み立てロジックだけを切り出している。
 */
export function buildResourceFilterParams(data: FormData): URLSearchParams {
  const params = new URLSearchParams();

  const category = data.get("category") as string;
  const from = data.get("from") as string;
  const to = data.get("to") as string;
  const keyword = data.get("keyword") as string;

  if (category && category !== "ALL") params.set("category", category);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (keyword?.trim()) params.set("keyword", keyword.trim());

  return params;
}

/**
 * リソース一覧のフィルタフォーム（クライアントコンポーネント）。
 *
 * カテゴリ・キーワード・空き確認（from/to）の入力を受け取り、
 * URL の searchParams を更新してサーバーコンポーネントに伝える。
 */
export function ResourceFilterForm({
  defaultCategory,
  defaultFrom,
  defaultTo,
  defaultKeyword,
}: ResourceFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const params = buildResourceFilterParams(data);
      router.push(`/resources?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleReset = useCallback(() => {
    router.push("/resources");
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold">フィルタ・空き確認</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* カテゴリ */}
        <div className="space-y-1">
          <Label htmlFor="category">カテゴリ</Label>
          <Select name="category" defaultValue={defaultCategory ?? "ALL"}>
            <SelectTrigger id="category">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">すべて</SelectItem>
              <SelectItem value="ROOM">{RESOURCE_CATEGORY_LABELS.ROOM}</SelectItem>
              <SelectItem value="EQUIPMENT">{RESOURCE_CATEGORY_LABELS.EQUIPMENT}</SelectItem>
              <SelectItem value="VEHICLE">{RESOURCE_CATEGORY_LABELS.VEHICLE}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* キーワード */}
        <div className="space-y-1">
          <Label htmlFor="keyword">キーワード</Label>
          <Input
            id="keyword"
            name="keyword"
            type="text"
            placeholder="名称・説明で検索"
            defaultValue={defaultKeyword}
          />
        </div>

        {/* 開始日時 */}
        <div className="space-y-1">
          <Label htmlFor="from">開始日時</Label>
          <Input
            id="from"
            name="from"
            type="datetime-local"
            defaultValue={defaultFrom?.replace("T", "T").slice(0, 16)}
          />
        </div>

        {/* 終了日時 */}
        <div className="space-y-1">
          <Label htmlFor="to">終了日時</Label>
          <Input
            id="to"
            name="to"
            type="datetime-local"
            defaultValue={defaultTo?.replace("T", "T").slice(0, 16)}
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
