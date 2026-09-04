import { Suspense } from "react";
import Link from "next/link";
import { listResourcesAction } from "@/server/actions/resources";
import { getProfileAction } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceFilterForm } from "./ResourceFilterForm";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/labels";

interface SearchParams {
  category?: string;
  keyword?: string;
  from?: string;
  to?: string;
  page?: string;
}

/**
 * リソース一覧画面（screen-spec.md §リソース /resources 準拠）。
 *
 * カテゴリフィルタ・空き確認フォーム（from/to）・リソースカードリストを表示する。
 * ADMIN は is_active=false のリソースもグレーアウト表示する（BE 側でロール判定）。
 */
export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const profile = await getProfileAction();
  const isAdmin = profile.role === "ADMIN";

  const resources = await listResourcesAction({
    category: params.category,
    keyword: params.keyword,
    from: params.from,
    to: params.to,
    page: params.page ? Number(params.page) : 0,
  });

  const hasTimeFilter = Boolean(params.from && params.to);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">リソース一覧</h1>
        {isAdmin && (
          <Link
            href="/admin/resources"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            リソース管理
          </Link>
        )}
      </div>

      {/* フィルタフォーム */}
      <ResourceFilterForm
        defaultCategory={params.category}
        defaultKeyword={params.keyword}
        defaultFrom={params.from}
        defaultTo={params.to}
      />

      {hasTimeFilter && (
        <p className="text-sm text-muted-foreground">
          {params.from} 〜 {params.to} の空きリソースを表示しています（{resources.totalElements}{" "}
          件）
        </p>
      )}

      {/* リソースカードリスト */}
      <Suspense fallback={<p className="text-muted-foreground">読み込み中...</p>}>
        {resources.content.length === 0 ? (
          <p className="text-muted-foreground">
            {hasTimeFilter
              ? "指定した時間帯に空きのあるリソースがありません。"
              : "リソースがありません。"}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.content.map((resource) => (
              <Card key={resource.id} className={!resource.isActive ? "opacity-50" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{resource.name}</CardTitle>
                    <div className="flex shrink-0 gap-1">
                      <Badge variant="secondary">
                        {RESOURCE_CATEGORY_LABELS[resource.category]}
                      </Badge>
                      {!resource.isActive && (
                        <Badge variant="outline" className="text-muted-foreground">
                          無効
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {resource.location && <p>📍 {resource.location}</p>}
                  {resource.capacity != null && <p>👥 定員 {resource.capacity} 名</p>}
                  {resource.requiresApproval && <p className="text-amber-600">⚠ 要承認</p>}
                  {resource.description && <p className="line-clamp-2">{resource.description}</p>}
                </CardContent>
                <CardFooter>
                  <Link
                    href={`/resources/${resource.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    詳細を見る →
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </Suspense>

      {/* ページネーション */}
      <PaginationNav
        page={resources.number}
        totalPages={resources.totalPages}
        first={resources.first}
        last={resources.last}
        totalElements={resources.totalElements}
        basePath="/resources"
        query={params as Record<string, string | string[] | undefined>}
      />
    </div>
  );
}
