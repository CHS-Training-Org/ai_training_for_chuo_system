import Link from "next/link";
import { getResourceAction } from "@/server/actions/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/labels";
import { AvailabilityCalendar } from "./AvailabilityCalendar";

/**
 * リソース詳細画面（screen-spec.md §リソース /resources/{id} 準拠）。
 *
 * リソース情報・空き状況カレンダーを表示し、「このリソースを予約する」ボタンまたは
 * カレンダーの空き枠クリックで /reservations/new へ遷移する。
 */
export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await getResourceAction(id);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 戻るリンク */}
      <Link href="/resources" className="text-sm text-primary hover:underline">
        ← リソース一覧に戻る
      </Link>

      {/* リソース基本情報 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl">{resource.name}</CardTitle>
            <div className="flex gap-1">
              <Badge variant="secondary">{RESOURCE_CATEGORY_LABELS[resource.category]}</Badge>
              {!resource.isActive && (
                <Badge variant="outline" className="text-muted-foreground">
                  無効
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {resource.location && (
              <>
                <dt className="font-medium text-muted-foreground">場所</dt>
                <dd>{resource.location}</dd>
              </>
            )}
            {resource.capacity != null && (
              <>
                <dt className="font-medium text-muted-foreground">定員</dt>
                <dd>{resource.capacity} 名</dd>
              </>
            )}
            <dt className="font-medium text-muted-foreground">承認フロー</dt>
            <dd>{resource.requiresApproval ? "要承認" : "承認不要（即時確定）"}</dd>
          </dl>
          {resource.description && (
            <p className="text-sm text-muted-foreground border-t pt-3">{resource.description}</p>
          )}
          {resource.equipment && (
            <div className="border-t pt-3">
              <h3 className="text-sm font-medium">設備一覧</h3>
              <p className="whitespace-pre-line text-sm text-muted-foreground">
                {resource.equipment}
              </p>
            </div>
          )}
          {resource.notes && (
            <div className="border-t pt-3">
              <h3 className="text-sm font-medium">利用上の注意</h3>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{resource.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 予約ボタン */}
      {resource.isActive && (
        <Button asChild>
          <Link href={`/reservations/new?resourceId=${resource.id}`}>このリソースを予約する</Link>
        </Button>
      )}

      {/* 空き状況カレンダー */}
      <AvailabilityCalendar resourceId={resource.id} isActive={resource.isActive} />
    </div>
  );
}
