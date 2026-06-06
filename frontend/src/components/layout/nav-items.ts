/**
 * サイドナビゲーション項目定義（screen-spec.md §共通レイアウト L87–94 準拠）
 *
 * ロール別表示制御をここに一元化し、純関数として単体テストを可能にする。
 */
import type { Role } from '@/lib/types'

export interface NavItem {
  label: string
  href: string
}

/** 全ロール共通メニュー */
const COMMON_ITEMS: NavItem[] = [
  { label: 'ダッシュボード', href: '/' },
  { label: 'リソース一覧', href: '/resources' },
  { label: 'マイ予約', href: '/reservations' },
]

/** APPROVER / ADMIN のみ表示 */
const APPROVER_ITEMS: NavItem[] = [{ label: '承認待ち一覧', href: '/approvals' }]

/** ADMIN のみ表示 */
const ADMIN_ITEMS: NavItem[] = [
  { label: 'リソース管理', href: '/admin/resources' },
  { label: 'ユーザー管理', href: '/admin/users' },
]

/**
 * ロールに応じて表示すべきサイドナビ項目を返す純関数。
 *
 * @param role - ユーザーロール。null の場合は空配列を返す（未認証）。
 */
export function navItemsForRole(role: Role | null | undefined): NavItem[] {
  if (!role) return []

  const items: NavItem[] = [...COMMON_ITEMS]

  if (role === 'APPROVER' || role === 'ADMIN') {
    items.push(...APPROVER_ITEMS)
  }

  if (role === 'ADMIN') {
    items.push(...ADMIN_ITEMS)
  }

  return items
}
