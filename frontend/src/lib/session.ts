/**
 * サーバーサイド セッション取得ラッパ
 *
 * Server Actions / Server Components から呼び出して現在のユーザーセッションを取得する。
 * セッションが存在しない場合は null を返す。
 *
 * カテゴリ 3（認証スライス）完成後に、この関数を api-client.ts の TokenGetter として渡す:
 *   const client = createApiClient(() => getSession().then(s => s?.session.token ?? null))
 */
import { auth } from './auth'
import { headers } from 'next/headers'

export type SessionData = Awaited<ReturnType<typeof auth.api.getSession>>

/**
 * 現在の HTTP リクエストのセッションを取得する。
 * Server Components / Server Actions 内でのみ呼び出し可。
 */
export async function getSession(): Promise<SessionData> {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * セッションから JWT アクセストークンを取得する。
 * Better Auth のセッションにアクセストークンが含まれる場合に返す。
 * 含まれない場合は null を返す（カテゴリ 3 で動作確認・調整を行う）。
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  if (!session) return null
  // Better Auth のセッションオブジェクト構造に依存する。
  // カテゴリ 3 で実際のレスポンス形状を確認して調整すること。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session as any)?.session?.accessToken ?? null
}
