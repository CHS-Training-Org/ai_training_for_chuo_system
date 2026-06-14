import Link from "next/link";
import { listResourcesAction } from "@/server/actions/resources";
import { ReservationForm } from "./ReservationForm";

/**
 * 予約申請フォーム画面（screen-spec.md §予約申請 /reservations/new 準拠）。
 *
 * `?resourceId={id}` で初期選択リソースを設定可能（リソース詳細画面からの遷移）。
 * 申請成功後は /reservations へリダイレクトする。
 * 重複時の 409 エラーは ReservationForm 内でキャッチしてインラインに表示する。
 */
export default async function ReservationNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const defaultResourceId = sp.resourceId;

  // 有効なリソース一覧を取得（フォームのセレクトに表示する）
  const resources = await listResourcesAction({ size: 100 });

  return (
    <div className="space-y-6 max-w-xl">
      <Link href="/resources" className="text-sm text-primary hover:underline">
        ← リソース一覧に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold">予約申請</h1>
        <p className="text-sm text-muted-foreground">リソースの利用時間帯を申請します。</p>
      </div>

      <ReservationForm resources={resources.content} defaultResourceId={defaultResourceId} />
    </div>
  );
}
