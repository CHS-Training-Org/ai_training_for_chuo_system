"use client";

import { useRouter } from "next/navigation";
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
  defaultKeyword?: string;
  defaultFrom?: string;
  defaultTo?: string;
  defaultSort?: string;
}

/**
 * リソース一覧のフィルタフォーム（クライアントコンポーネント）。
 *
 * カテゴリフィルタ・空き確認（from/to）の入力を受け取り、
 * URL の searchParams を更新してサーバーコンポーネントに伝える。
 */
export function ResourceFilterForm({
  defaultCategory,
  defaultKeyword,
  defaultFrom,
  defaultTo,
  defaultSort,
}: ResourceFilterFormProps) {
  const router = useRouter();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      const params = new URLSearchParams();

      const category = data.get("category") as string;
      const keyword = data.get("keyword") as string;
      const from = data.get("from") as string;
      const to = data.get("to") as string;
      const sort = data.get("sort") as string;

      if (category && category !== "ALL") params.set("category", category);
      if (keyword) params.set("keyword", keyword);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (sort) params.set("sort", sort);

      router.push(`/resources?${params.toString()}`);
    },
    [router],
  );

  const handleReset = useCallback(() => {
    router.push("/resources");
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold">フィルタ・空き確認</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
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
            placeholder="名前・説明で検索"
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

        {/* 並び順 */}
        <div className="space-y-1">
          <Label htmlFor="sort">並び順</Label>
          <Select name="sort" defaultValue={defaultSort ?? "createdAt,asc"}>
            <SelectTrigger id="sort">
              <SelectValue placeholder="並び順を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt,asc">登録日時 昇順</SelectItem>
              <SelectItem value="createdAt,desc">登録日時 降順</SelectItem>
              <SelectItem value="name,asc">名前 昇順</SelectItem>
              <SelectItem value="name,desc">名前 降順</SelectItem>
              <SelectItem value="capacity,asc">定員 昇順</SelectItem>
              <SelectItem value="capacity,desc">定員 降順</SelectItem>
            </SelectContent>
          </Select>
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
