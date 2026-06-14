import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationNavProps {
  /** 現在ページ番号（0 始まり） */
  page: number;
  totalPages: number;
  /** Spring Page<T>.first — 最初のページか */
  first: boolean;
  /** Spring Page<T>.last — 最後のページか */
  last: boolean;
  totalElements: number;
  /** ページ遷移の基準パス（例: "/reservations"） */
  basePath: string;
  /** 現在の searchParams。page 以外のキーを引き継いで href を生成する */
  query: Record<string, string | string[] | undefined>;
}

/**
 * page だけ差し替えた href を生成するヘルパ。
 * status 等の配列値・既存フィルタを保持しつつ page を上書きする。
 * page=0 の場合はクエリから省略（デフォルト扱い）。
 */
export function buildHref(
  basePath: string,
  query: Record<string, string | string[] | undefined>,
  targetPage: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "page") continue; // 後で付け直す
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  if (targetPage > 0) {
    params.set("page", String(targetPage));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * ページネーション prev/next コンポーネント（Server Component）。
 *
 * totalPages <= 1 の場合は何も描画しない。
 * disabled 状態は Button の disabled prop（`disabled:pointer-events-none disabled:opacity-50`）で表現し、
 * Link を使わない。
 */
export function PaginationNav({
  page,
  totalPages,
  first,
  last,
  totalElements,
  basePath,
  query,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  const prevHref = buildHref(basePath, query, page - 1);
  const nextHref = buildHref(basePath, query, page + 1);

  return (
    <div className="flex items-center justify-between">
      {first ? (
        <Button variant="outline" size="sm" disabled aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
          前へ
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={prevHref}>
            <ChevronLeft className="h-4 w-4" />
            前へ
          </Link>
        </Button>
      )}

      <p className="text-sm text-muted-foreground">
        {page + 1} / {totalPages} ページ（全 {totalElements} 件）
      </p>

      {last ? (
        <Button variant="outline" size="sm" disabled aria-disabled="true">
          次へ
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={nextHref}>
            次へ
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
