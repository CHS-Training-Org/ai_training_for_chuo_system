/**
 * Server Actions: dev-auth.ts のユニットテスト
 *
 * ローカル開発専用ロール別ログイン。cognito-local への InitiateAuth を MSW でスタブし、
 * IdToken の cookie 保存・リダイレクト・エラー時の挙動・本番ガードを検証する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../msw/server'

const COGNITO_LOCAL_ENDPOINT = 'http://cognito-local:9229'

const cookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(cookieStore),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))
// dev-auth.ts は cookie 名の定数のみを参照する。実体の session.ts を読み込むと
// 連鎖的に @/lib/auth（実 Better Auth インスタンス生成）まで読み込まれ、
// テスト環境では Cognito 関連 env 未設定のため初期化エラーになるためモックする。
vi.mock('@/lib/session', () => ({
  DEV_ID_TOKEN_COOKIE: 'dev-id-token',
}))

const { redirect } = await import('next/navigation')
const { devLoginAction } = await import('@/server/actions/dev-auth')

// scripts/provision-cognito.sh が作成するシードユーザー共通パスワード
const SEED_USER_PASSWORD = 'BookFlow1234!'

function formDataWithRole(role: string): FormData {
  const fd = new FormData()
  fd.set('role', role)
  return fd
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development')
  vi.stubEnv('COGNITO_CLIENT_ID', 'test-client-id')
  vi.stubEnv('COGNITO_LOCAL_ENDPOINT', COGNITO_LOCAL_ENDPOINT)
  cookieStore.set.mockClear()
  vi.mocked(redirect).mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('devLoginAction', () => {
  it.each([
    ['MEMBER', 'hanako.tanaka@example.com'],
    ['APPROVER', 'ichiro.suzuki@example.com'],
    ['ADMIN', 'taro.kanri@example.com'],
  ])(
    '%s ロール選択時、対応するシードユーザーで InitiateAuth し、IdToken を cookie に保存して / へリダイレクトする',
    async (role, expectedEmail) => {
      let capturedBody: Record<string, unknown> | null = null

      server.use(
        http.post(`${COGNITO_LOCAL_ENDPOINT}/`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({
            AuthenticationResult: { IdToken: `id-token-for-${role}` },
          })
        }),
      )

      await devLoginAction(formDataWithRole(role))

      expect(capturedBody).not.toBeNull()
      expect(capturedBody).toMatchObject({
        ClientId: 'test-client-id',
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: expectedEmail,
          PASSWORD: SEED_USER_PASSWORD,
        },
      })

      expect(cookieStore.set).toHaveBeenCalledWith(
        'dev-id-token',
        `id-token-for-${role}`,
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          secure: false,
        }),
      )
      expect(redirect).toHaveBeenCalledWith('/')
    },
  )

  it('cognito-local が IdToken を返さない場合はエラーを投げ、cookie 保存もリダイレクトも行わない', async () => {
    server.use(
      http.post(`${COGNITO_LOCAL_ENDPOINT}/`, () => {
        return HttpResponse.json({ AuthenticationResult: {} })
      }),
    )

    await expect(devLoginAction(formDataWithRole('MEMBER'))).rejects.toThrow()

    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('cognito-local が非 2xx を返す場合はエラーを投げる', async () => {
    server.use(
      http.post(`${COGNITO_LOCAL_ENDPOINT}/`, () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    await expect(devLoginAction(formDataWithRole('MEMBER'))).rejects.toThrow()
  })

  it('不正な role 値はバリデーションエラーになる', async () => {
    await expect(
      devLoginAction(formDataWithRole('SUPERUSER')),
    ).rejects.toThrow()

    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('NODE_ENV=production の場合は常にエラーを投げ、何も行わない（本番非混入ガード）', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await expect(devLoginAction(formDataWithRole('MEMBER'))).rejects.toThrow()

    expect(cookieStore.set).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})
