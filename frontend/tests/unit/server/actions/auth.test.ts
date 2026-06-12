/**
 * Server Actions: auth.ts のユニットテスト
 * MSW で /api/backend/users/me をスタブ、Next.js サーバー側モジュールはモック。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'
import { MOCK_USER_RESPONSE } from '../../msw/handlers'

// Next.js サーバー専用モジュールをモック
const cookieStore = {
  delete: vi.fn(),
}

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue(cookieStore),
}))

// Better Auth サーバーインスタンスをモック
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signOut: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

// getAccessToken をモック（トークン取得のみ切り離す）
vi.mock('@/lib/session', () => ({
  DEV_ID_TOKEN_COOKIE: 'dev-id-token',
  getSession: vi.fn().mockResolvedValue({ session: { accessToken: 'test-token' } }),
  getAccessToken: vi.fn().mockResolvedValue('test-token'),
}))

// モック後にインポート（vi.mock はホイストされる）
const { redirect } = await import('next/navigation')
const { auth } = await import('@/lib/auth')
const { getProfileAction, signOutAction } = await import('@/server/actions/auth')

describe('getProfileAction', () => {
  it('正常時: /users/me を呼び出して UserResponse を返す', async () => {
    const profile = await getProfileAction()

    expect(profile.id).toBe(MOCK_USER_RESPONSE.id)
    expect(profile.name).toBe(MOCK_USER_RESPONSE.name)
    expect(profile.email).toBe(MOCK_USER_RESPONSE.email)
    expect(profile.role).toBe('MEMBER')
    expect(profile.departmentId).toBe(MOCK_USER_RESPONSE.departmentId)
    expect(profile.departmentName).toBe(MOCK_USER_RESPONSE.departmentName)
  })

  it('401 時: ApiClientError をスローする', async () => {
    server.use(
      http.get('/api/backend/users/me', () => {
        return HttpResponse.json(
          { code: 'UNAUTHORIZED', message: '認証が必要です' },
          { status: 401 },
        )
      }),
    )

    await expect(getProfileAction()).rejects.toThrow()
  })
})

describe('signOutAction', () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear()
    vi.mocked(auth.api.signOut).mockClear()
    cookieStore.delete.mockClear()
  })

  it('auth.api.signOut と dev-id-token cookie の削除を行った後 /auth/signin へリダイレクトする', async () => {
    // redirect() は Next.js の実装では例外をスローするが、モックでは void
    await signOutAction()

    expect(auth.api.signOut).toHaveBeenCalledOnce()
    expect(cookieStore.delete).toHaveBeenCalledWith('dev-id-token')
    expect(redirect).toHaveBeenCalledWith('/auth/signin')
  })
})
