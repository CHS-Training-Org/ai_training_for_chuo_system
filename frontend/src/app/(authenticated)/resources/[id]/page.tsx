import Link from "next/link";
import { getResourceAction, getAvailabilityAction } from "@/server/actions/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * リソース詳細画面（screen-spec.md §リソース /resources/{id} 準拠）。
 *
 * リソース情報・空き状況（OccupiedSlot[]）を表示し、「このリソースを予約する」ボタンで
 * /reservations/new へ遷移する（カテゴリ 5 で実装予定）。
 * 空き照会は当日〜7日後の範囲をデフォルト表示する。
 */
export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await getResourceAction(id);

  // デフォルトの空き照会範囲: 今日〜7日後
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fromStr = now.toISOString().slice(0, 19);
  const toStr = weekLater.toISOString().slice(0, 19);

  let slots: Awaited<ReturnType<typeof getAvailabilityAction>> = [];
  try {
    slots = await getAvailabilityAction(id, fromStr, toStr);
  } catch {
    // 空き照会エラーは無視してリソース詳細は表示する
  }

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
              <Badge variant="secondary">{resource.category}</Badge>
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
        </CardContent>
      </Card>

      {/* 予約ボタン */}
      {resource.isActive && (
        <Button asChild>
          <Link href={`/reservations/new?resourceId=${resource.id}`}>このリソースを予約する</Link>
        </Button>
      )}

      {/* 空き状況 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          空き状況（{now.toLocaleDateString("ja-JP")} 〜 {weekLater.toLocaleDateString("ja-JP")}）
        </h2>

        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            指定期間に予約はありません（空き状況良好）。
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              以下の時間帯は予約済みです（全 {slots.length} 件）：
            </p>
            <ul className="space-y-1">
              {slots.map((slot) => (
                <li
                  key={slot.reservationId}
                  className="flex items-center gap-2 rounded border bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="text-red-500">●</span>
                  <span>
                    {new Date(slot.startAt).toLocaleString("ja-JP")} 〜{" "}
                    {new Date(slot.endAt).toLocaleString("ja-JP")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
