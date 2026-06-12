/**
 * lib/session.ts のユニットテスト
 *
 * 開発専用ロールログイン cookie（dev-id-token）の優先分岐と、
 * 本番ビルド（NODE_ENV=production）ではその分岐に絶対に入らないこと
 * （cookie が存在しても無視し Better Auth 経路にフォールバックすること）を検証する。
 * これは認証バイパス機能の本番混入を防ぐセキュリティ回帰テストである。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = {
  get: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(cookieStore),
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

const getSessionMock = vi.fn()
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}))

const { getSession, getAccessToken, DEV_ID_TOKEN_COOKIE } = await import(
  '@/lib/session'
)

const DEV_ID_TOKEN = 'dev.id.token'
const BETTER_AUTH_SESSION = { session: { accessToken: 'better-auth-token' } }

function setDevCookie(value: string | undefined): void {
  cookieStore.get.mockImplementation((name: string) =>
    name === DEV_ID_TOKEN_COOKIE && value !== undefined ? { value } : undefined,
  )
}

beforeEach(() => {
  cookieStore.get.mockReset()
  getSessionMock.mockReset()
  getSessionMock.mockResolvedValue(BETTER_AUTH_SESSION)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('開発時（NODE_ENV !== production）に dev-id-token cookie が存在する場合', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    setDevCookie(DEV_ID_TOKEN)
  })

  it('getSession は非 null の疑似セッションを返す（Better Auth を呼ばない）', async () => {
    const session = await getSession()

    expect(session).not.toBeNull()
    expect(getSessionMock).not.toHaveBeenCalled()
  })

  it('getAccessToken は cookie の IdToken をそのまま返す', async () => {
    const token = await getAccessToken()

    expect(token).toBe(DEV_ID_TOKEN)
  })
})

describe('NODE_ENV=production の場合（本番非混入の回帰ガード）', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    setDevCookie(DEV_ID_TOKEN)
  })

  it('dev-id-token cookie が存在しても無視し、Better Auth のセッションにフォールバックする', async () => {
    const session = await getSession()

    expect(session).toBe(BETTER_AUTH_SESSION)
    expect(getSessionMock).toHaveBeenCalledOnce()
  })

  it('getAccessToken も cookie の値を返さず、Better Auth セッションの accessToken を返す', async () => {
    const token = await getAccessToken()

    expect(token).toBe('better-auth-token')
  })
})

describe('dev-id-token cookie が存在しない場合', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    setDevCookie(undefined)
  })

  it('getSession は Better Auth のセッションをそのまま返す', async () => {
    const session = await getSession()

    expect(session).toBe(BETTER_AUTH_SESSION)
    expect(getSessionMock).toHaveBeenCalledOnce()
  })

  it('getAccessToken は Better Auth セッションの accessToken を返す', async () => {
    const token = await getAccessToken()

    expect(token).toBe('better-auth-token')
  })

  it('セッションが無い場合 getAccessToken は null を返す', async () => {
    getSessionMock.mockResolvedValue(null)

    const token = await getAccessToken()

    expect(token).toBeNull()
  })
})
