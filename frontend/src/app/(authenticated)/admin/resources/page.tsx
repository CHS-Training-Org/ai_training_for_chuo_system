import { listResourcesAction } from "@/server/actions/resources";
import { ResourceManagementClient } from "./ResourceManagementClient";

/**
 * リソース管理画面（screen-spec.md §リソース管理 /admin/resources 準拠）。
 *
 * ADMIN 専用（親 admin/layout.tsx でロールガード済み）。
 * 全リソース一覧（inactive 含む）・新規登録・編集・有効/無効切替を提供する。
 */
export default async function AdminResourcesPage() {
  // ADMIN は BE 側でロール判定し inactive 含む全件を返す
  const resources = await listResourcesAction({ size: 100 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">リソース管理</h1>
          <p className="text-sm text-muted-foreground">
            全 {resources.totalElements} 件（有効 /{" "}
            {resources.content.filter((r) => r.isActive).length} 件）
          </p>
        </div>
      </div>

      {/* クライアントコンポーネントに一覧データと操作を委譲 */}
      <ResourceManagementClient resources={resources.content} />
    </div>
  );
}
