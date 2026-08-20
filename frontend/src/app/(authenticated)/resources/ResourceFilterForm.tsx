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
import { RESOURCE_CATEGORY_LABELS, RESOURCE_SORT_OPTIONS } from "@/lib/labels";

export const DEFAULT_SORT = "createdAt,asc";

interface ResourceFilterFormProps {
  defaultCategory?: string;
  defaultKeyword?: string;
  defaultFrom?: string;
  defaultTo?: string;
  defaultSort?: string;
}

interface ResourceFilterValues {
  category?: string;
  keyword?: string;
  from?: string;
  to?: string;
  sort?: string;
}

/**
 * フィルタフォームの入力値から /resources 遷移先の query 文字列を組み立てる純関数。
 * sort は選択値がデフォルト（DEFAULT_SORT）と一致する場合は URL に付与しない。
 */
export function buildResourceFilterQuery({
  category,
  keyword,
  from,
  to,
  sort,
}: ResourceFilterValues): string {
  const params = new URLSearchParams();

  if (category && category !== "ALL") params.set("category", category);
  if (keyword) params.set("keyword", keyword);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (sort && sort !== DEFAULT_SORT) params.set("sort", sort);

  return params.toString();
}

/**
 * リソース一覧のフィルタフォーム（クライアントコンポーネント）。
 *
 * カテゴリ・キーワード・空き確認（from/to）の入力を受け取り、
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
  const searchParams = useSearchParams();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);

      const query = buildResourceFilterQuery({
        category: data.get("category") as string,
        keyword: (data.get("keyword") as string).trim(),
        from: data.get("from") as string,
        to: data.get("to") as string,
        sort: data.get("sort") as string,
      });

      router.push(`/resources?${query}`);
    },
    [router, searchParams],
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
            type="text"
            placeholder="名称・説明で検索"
            defaultValue={defaultKeyword}
            data-testid="resource-filter-keyword-input"
          />
        </div>

        {/* 並び替え */}
        <div className="space-y-1">
          <Label htmlFor="sort">並び替え</Label>
          <Select name="sort" defaultValue={defaultSort ?? DEFAULT_SORT}>
            <SelectTrigger id="sort" data-testid="resource-filter-form-sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
