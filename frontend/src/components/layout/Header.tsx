/**
 * ヘッダーコンポーネント（screen-spec.md §共通レイアウト L77–83 準拠）
 *
 * 要素:
 *   - ロゴ（BookFlow）→ / へリンク
 *   - ユーザー名 ＋ ロールバッジ（MEMBER=グレー / APPROVER=青 / ADMIN=紫）
 *   - サインアウトボタン（カテゴリ 3 で Server Action と接続）
 */
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Role } from '@/lib/types'

interface HeaderProps {
  userName?: string
  role?: Role | null
  /** サインアウト Server Action（カテゴリ 3 で実装） */
  onSignOut?: () => Promise<void>
}

/** ロールバッジのバリアント（ロールバッジ色: screen-spec.md L313 準拠） */
function roleBadgeVariant(role: Role): 'secondary' | 'default' | 'outline' {
  switch (role) {
    case 'ADMIN':
      return 'default' // 紫系（primary）
    case 'APPROVER':
      return 'secondary' // 青系
    case 'MEMBER':
      return 'outline' // グレー
  }
}

/** ロール表示名 */
function roleLabel(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '管理者'
    case 'APPROVER':
      return '承認者'
    case 'MEMBER':
      return '一般'
  }
}

export function Header({ userName, role, onSignOut }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      {/* ロゴ */}
      <Link href="/" className="text-lg font-semibold tracking-tight">
        BookFlow
      </Link>

      {/* ユーザー情報 + サインアウト */}
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-muted-foreground">{userName}</span>
        )}
        {role && (
          <Badge variant={roleBadgeVariant(role)}>{roleLabel(role)}</Badge>
        )}
        {onSignOut && (
          <form action={onSignOut}>
            <Button type="submit" variant="ghost" size="sm">
              サインアウト
            </Button>
          </form>
        )}
      </div>
    </header>
  )
}
