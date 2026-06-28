import { listUsersAction } from "@/server/actions/users";
import { UserManagementClient } from "./UserManagementClient";
import { PaginationNav } from "@/components/ui/pagination-nav";

/**
 * ユーザー管理画面（screen-spec.md §ユーザー管理 /admin/users 準拠）。
 *
 * ADMIN 専用（親 admin/layout.tsx でロールガード済み）。
 * ユーザー一覧を閲覧専用で表示する（ロール変更は拡張課題・requirements.md USER-03）。
 * page で 20 件ずつページネーション。
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ADMIN の場合、BE が全ユーザー一覧を返す（MEMBER / APPROVER は admin/layout.tsx でブロック済み）
  const sp = await searchParams;
  const page = Number(sp.page ?? 0);
  const users = await listUsersAction({ page, size: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
        <p className="text-sm text-muted-foreground">全 {users.totalElements} 名</p>
      </div>

      <UserManagementClient users={users.content} />

      <PaginationNav
        page={users.number}
        totalPages={users.totalPages}
        first={users.first}
        last={users.last}
        totalElements={users.totalElements}
        basePath="/admin/users"
        query={sp}
      />
    </div>
  );
}
