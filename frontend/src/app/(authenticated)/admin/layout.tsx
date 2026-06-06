import { getProfileAction } from '@/server/actions/auth'

/**
 * /admin/* 配下の共通レイアウト（ADMIN ガード）。
 *
 * screen-spec.md §共通 の権限ポリシーに従い、ADMIN 以外のロールが /admin/* にアクセスした場合は
 * 403 画面を表示する（/auth/signin へのリダイレクトではない）。
 * 認証チェック自体は親の (authenticated)/layout.tsx が担当。
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let isAdmin = false
  try {
    const profile = await getProfileAction()
    isAdmin = profile.role === 'ADMIN'
  } catch {
    // プロフィール取得失敗は親レイアウトで処理済みのため、ここでは非 ADMIN として扱う
    isAdmin = false
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-6xl font-bold text-muted-foreground">403</p>
        <p className="text-xl font-semibold">アクセス権限がありません</p>
        <p className="text-muted-foreground">このページは管理者（ADMIN）専用です。</p>
      </div>
    )
  }

  return <>{children}</>
}
