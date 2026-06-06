import { http, HttpResponse } from 'msw'

// ---------------------------------------------------------------------------
// モックデータ定数
// ---------------------------------------------------------------------------

export const MOCK_USER_RESPONSE = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'テスト会員',
  email: 'test@example.com',
  role: 'MEMBER',
  departmentId: '00000000-0000-0000-0000-000000000001',
  departmentName: '開発部',
  createdAt: '2025-04-01T09:00:00',
}

export const MOCK_RESOURCE_RESPONSE = {
  id: '20000000-0000-0000-0000-000000000001',
  name: '第1会議室',
  category: 'ROOM',
  capacity: 10,
  location: '3F',
  requiresApproval: false,
  isActive: true,
  description: 'プロジェクター完備',
  createdAt: '2025-04-01T09:00:00',
}

export const MOCK_RESOURCE_LIST_RESPONSE = {
  content: [MOCK_RESOURCE_RESPONSE],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
  first: true,
  last: true,
}

export const MOCK_AVAILABILITY_SLOTS = [
  {
    reservationId: '30000000-0000-0000-0000-000000000001',
    startAt: '2025-06-02T10:00:00',
    endAt: '2025-06-02T12:00:00',
  },
]

export const MOCK_RESERVATION_RESPONSE = {
  id: '40000000-0000-0000-0000-000000000001',
  resourceId: MOCK_RESOURCE_RESPONSE.id,
  resourceName: '第1会議室',
  requesterId: '00000000-0000-0000-0000-000000000002',
  requesterName: 'テスト会員',
  startAt: '2025-07-01T10:00:00',
  endAt: '2025-07-01T12:00:00',
  purpose: '週次ミーティング',
  attendeesCount: 5,
  status: 'APPROVED',
  createdAt: '2025-06-01T09:00:00',
  updatedAt: '2025-06-01T09:00:00',
}

export const MOCK_RESERVATION_LIST_RESPONSE = {
  content: [MOCK_RESERVATION_RESPONSE],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
  first: true,
  last: true,
}

export const MOCK_USER_LIST_RESPONSE = {
  content: [
    MOCK_USER_RESPONSE,
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: '管理者',
      email: 'admin@example.com',
      role: 'ADMIN',
      departmentId: '00000000-0000-0000-0000-000000000001',
      departmentName: '開発部',
      createdAt: '2025-04-01T09:00:00',
    },
  ],
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
  first: true,
  last: true,
}

export const MOCK_APPROVAL_STEP = {
  id: '50000000-0000-0000-0000-000000000001',
  reservationId: MOCK_RESERVATION_RESPONSE.id,
  resourceName: '第1会議室',
  requesterName: 'テスト会員',
  startAt: '2025-07-01T10:00:00',
  endAt: '2025-07-01T12:00:00',
  purpose: '週次ミーティング',
  stepOrder: 1,
  status: 'PENDING',
  createdAt: '2025-06-01T09:00:00',
}

// ---------------------------------------------------------------------------
// MSW ハンドラ
// ---------------------------------------------------------------------------

export const handlers = [
  // ヘルスチェック
  http.get('/api/backend/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  // 認証
  http.get('/api/backend/users/me', () => {
    return HttpResponse.json(MOCK_USER_RESPONSE)
  }),

  // リソース一覧
  http.get('/api/backend/resources', () => {
    return HttpResponse.json(MOCK_RESOURCE_LIST_RESPONSE)
  }),

  // リソース詳細
  http.get('/api/backend/resources/:id', ({ params }) => {
    const { id } = params
    if (id === MOCK_RESOURCE_RESPONSE.id) {
      return HttpResponse.json(MOCK_RESOURCE_RESPONSE)
    }
    return HttpResponse.json({ code: 'NOT_FOUND', message: 'リソースが存在しません' }, { status: 404 })
  }),

  // 空き状況照会
  http.get('/api/backend/resources/:id/availability', ({ params }) => {
    const { id } = params
    if (id === MOCK_RESOURCE_RESPONSE.id) {
      return HttpResponse.json(MOCK_AVAILABILITY_SLOTS)
    }
    return HttpResponse.json({ code: 'NOT_FOUND', message: 'リソースが存在しません' }, { status: 404 })
  }),

  // リソース登録（ADMIN）
  http.post('/api/backend/resources', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        ...MOCK_RESOURCE_RESPONSE,
        id: '20000000-0000-0000-0000-000000000099',
        name: body.name ?? MOCK_RESOURCE_RESPONSE.name,
      },
      { status: 201 },
    )
  }),

  // リソース更新（ADMIN）
  http.put('/api/backend/resources/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      ...MOCK_RESOURCE_RESPONSE,
      id: params.id,
      name: body.name ?? MOCK_RESOURCE_RESPONSE.name,
    })
  }),

  // ステータス切替（ADMIN）
  http.patch('/api/backend/resources/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as { isActive: boolean }
    return HttpResponse.json({
      ...MOCK_RESOURCE_RESPONSE,
      id: params.id,
      isActive: body.isActive,
    })
  }),

  // 予約一覧
  http.get('/api/backend/reservations', () => {
    return HttpResponse.json(MOCK_RESERVATION_LIST_RESPONSE)
  }),

  // 予約詳細
  http.get('/api/backend/reservations/:id', ({ params }) => {
    const { id } = params
    if (id === MOCK_RESERVATION_RESPONSE.id) {
      return HttpResponse.json(MOCK_RESERVATION_RESPONSE)
    }
    return HttpResponse.json({ code: 'NOT_FOUND', message: '予約が存在しません' }, { status: 404 })
  }),

  // 予約申請
  http.post('/api/backend/reservations', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        ...MOCK_RESERVATION_RESPONSE,
        id: '40000000-0000-0000-0000-000000000099',
        purpose: body.purpose ?? MOCK_RESERVATION_RESPONSE.purpose,
        startAt: body.startAt ?? MOCK_RESERVATION_RESPONSE.startAt,
        endAt: body.endAt ?? MOCK_RESERVATION_RESPONSE.endAt,
      },
      { status: 201 },
    )
  }),

  // 予約内容更新
  http.put('/api/backend/reservations/:id', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      ...MOCK_RESERVATION_RESPONSE,
      id: params.id,
      purpose: body.purpose ?? MOCK_RESERVATION_RESPONSE.purpose,
      startAt: body.startAt ?? MOCK_RESERVATION_RESPONSE.startAt,
      endAt: body.endAt ?? MOCK_RESERVATION_RESPONSE.endAt,
    })
  }),

  // キャンセル
  http.post('/api/backend/reservations/:id/cancel', ({ params }) => {
    return HttpResponse.json({
      ...MOCK_RESERVATION_RESPONSE,
      id: params.id,
      status: 'CANCELLED',
      updatedAt: '2025-06-01T10:00:00',
    })
  }),

  // ユーザー一覧（ADMIN 専用・ページネーション）
  http.get('/api/backend/users', () => {
    return HttpResponse.json(MOCK_USER_LIST_RESPONSE)
  }),

  // 承認待ち一覧（bare array・ページネーションなし）
  http.get('/api/backend/approvals/pending', () => {
    return HttpResponse.json([MOCK_APPROVAL_STEP])
  }),

  // 承認操作
  http.post('/api/backend/approvals/:stepId/approve', ({ params }) => {
    return HttpResponse.json({
      ...MOCK_APPROVAL_STEP,
      id: params.stepId,
      status: 'APPROVED',
    })
  }),

  // 却下操作
  http.post('/api/backend/approvals/:stepId/reject', ({ params }) => {
    return HttpResponse.json({
      ...MOCK_APPROVAL_STEP,
      id: params.stepId,
      status: 'REJECTED',
    })
  }),
]
