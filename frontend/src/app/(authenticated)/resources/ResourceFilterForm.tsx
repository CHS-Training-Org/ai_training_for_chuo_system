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
  defaultKeyword?: string;
  defaultCategory?: string;
  defaultFrom?: string;
  defaultTo?: string;
}

/** リソース一覧の絞り込み条件。空文字・undefined はいずれも「指定なし」として扱う。 */
export interface ResourceFilterValues {
  keyword?: string;
  category?: string;
  from?: string;
  to?: string;
}

/** キーワードの最大長。バックエンドの検証（100 文字）と揃える。 */
export const KEYWORD_MAX_LENGTH = 100;

/**
 * 絞り込み条件から遷移先の URL を組み立てる。
 *
 * 値が空のキーはクエリに含めない。これによりキーワード欄を空にして送信すると
 * URL から keyword が消え、キーワード条件だけが解除される。
 * カテゴリの "ALL" は「すべて」を意味するため同様に含めない。
 *
 * レンダリングを伴わずに検証できるよう、コンポーネントから切り出した純関数として公開する
 * （`components/ui/pagination-nav.tsx` の `buildHref` と同じ方針）。
 */
export function buildResourceFilterHref(values: ResourceFilterValues): string {
  const params = new URLSearchParams();

  if (values.keyword) params.set("keyword", values.keyword);
  if (values.category && values.category !== "ALL") params.set("category", values.category);
  if (values.from) params.set("from", values.from);
  if (values.to) params.set("to", values.to);

  const query = params.toString();
  return query ? `/resources?${query}` : "/resources";
}

/**
 * リソース一覧のフィルタフォーム（クライアントコンポーネント）。
 *
 * キーワード検索・カテゴリフィルタ・空き確認（from/to）の入力を受け取り、
 * URL の searchParams を更新してサーバーコンポーネントに伝える。
 */
export function ResourceFilterForm({
  defaultKeyword,
  defaultCategory,
  defaultFrom,
  defaultTo,
}: ResourceFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);

      router.push(
        buildResourceFilterHref({
          keyword: data.get("keyword") as string,
          category: data.get("category") as string,
          from: data.get("from") as string,
          to: data.get("to") as string,
        }),
      );
    },
    [router, searchParams],
  );

  const handleReset = useCallback(() => {
    router.push("/resources");
  }, [router]);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold">フィルタ・空き確認</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* キーワード */}
        <div className="space-y-1">
          <Label htmlFor="keyword">キーワード</Label>
          <Input
            id="keyword"
            name="keyword"
            type="text"
            maxLength={KEYWORD_MAX_LENGTH}
            placeholder="リソース名・説明で検索"
            defaultValue={defaultKeyword}
            data-testid="resource-filter-keyword-input"
          />
        </div>

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
