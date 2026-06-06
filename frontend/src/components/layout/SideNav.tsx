/**
 * サイドナビゲーションコンポーネント（screen-spec.md §共通レイアウト 準拠）
 *
 * ロール別表示制御は navItemsForRole() に委譲。
 * 認証ガード・セッション取得はレイアウト側（layout.tsx）が行い、
 * このコンポーネントは props として role を受け取るだけにする。
 */
import Link from 'next/link'
import type { Role } from '@/lib/types'
import { navItemsForRole } from './nav-items'

interface SideNavProps {
  role: Role | null | undefined
  currentPath?: string
}

export function SideNav({ role, currentPath }: SideNavProps) {
  const items = navItemsForRole(role)

  return (
    <nav className="flex h-full w-56 flex-col border-r bg-card px-3 py-4">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = currentPath === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  isActive
                    ? 'flex items-center rounded-md px-3 py-2 text-sm font-medium bg-accent text-accent-foreground'
                    : 'flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'
                }
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
