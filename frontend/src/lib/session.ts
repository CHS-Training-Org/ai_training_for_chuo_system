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
import { cookies, headers } from 'next/headers'

export type SessionData = Awaited<ReturnType<typeof auth.api.getSession>>

/**
 * ローカル開発専用ロール別ログイン（dev-auth.ts）が発行する cookie 名。
 *
 * NODE_ENV !== 'production' の場合のみ、この cookie を信頼してセッションとして扱う
 * （ADR-008 補足。cognito-local には Hosted UI が無く本番同様の OAuth が成立しないため）。
 * 本番ビルドではこの分岐に絶対に入らないことが安全性の前提となる。
 */
export const DEV_ID_TOKEN_COOKIE = 'dev-id-token'

async function getDevIdToken(): Promise<string | null> {
  if (process.env.NODE_ENV === 'production') return null
  const cookieStore = await cookies()
  return cookieStore.get(DEV_ID_TOKEN_COOKIE)?.value ?? null
}

/**
 * 現在の HTTP リクエストのセッションを取得する。
 * Server Components / Server Actions 内でのみ呼び出し可。
 *
 * 開発専用ロールログイン cookie が存在する場合はそれを優先する
 * （非 null であることのみが要件のため疑似セッションを返す。中身は
 * Better Auth の内部型に依存しない）。
 */
export async function getSession(): Promise<SessionData> {
  const devIdToken = await getDevIdToken()
  if (devIdToken) {
    return { session: {}, user: {} } as unknown as SessionData
  }
  return auth.api.getSession({ headers: await headers() })
}

/**
 * セッションから JWT アクセストークンを取得する。
 * Better Auth のセッションにアクセストークンが含まれる場合に返す。
 * 含まれない場合は null を返す（カテゴリ 3 で動作確認・調整を行う）。
 *
 * 開発専用ロールログイン cookie が存在する場合は、そこに保存された
 * IdToken をそのまま返す（BE は custom:role / sub クレームを参照するため、
 * これらを含む IdToken である必要がある）。
 */
export async function getAccessToken(): Promise<string | null> {
  const devIdToken = await getDevIdToken()
  if (devIdToken) return devIdToken

  const session = await getSession()
  if (!session) return null
  // Better Auth のセッションオブジェクト構造に依存する。
  // カテゴリ 3 で実際のレスポンス形状を確認して調整すること。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session as any)?.session?.accessToken ?? null
}
