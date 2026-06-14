"use client";

import type { UserResponse } from "@/lib/types/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// ロールバッジ（screen-spec.md §ユーザー管理 行313）
// MEMBER=グレー / APPROVER=青 / ADMIN=紫
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  MEMBER: "一般社員",
  APPROVER: "承認者",
  ADMIN: "管理者",
};

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN") {
    return (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
        {ROLE_LABELS[role] ?? role}
      </Badge>
    );
  }
  if (role === "APPROVER") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        {ROLE_LABELS[role] ?? role}
      </Badge>
    );
  }
  // MEMBER
  return <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>;
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

interface UserManagementClientProps {
  users: UserResponse[];
}

/**
 * ユーザー一覧テーブル（閲覧専用）。
 *
 * 列：名前 / メールアドレス / ロールバッジ / 部署名（screen-spec.md §ユーザー管理 準拠）。
 * ロール変更機能はベース実装の対象外（requirements.md USER-03）。
 */
export function UserManagementClient({ users }: UserManagementClientProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>部署</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                ユーザーが見つかりません
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell>{user.departmentName}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
