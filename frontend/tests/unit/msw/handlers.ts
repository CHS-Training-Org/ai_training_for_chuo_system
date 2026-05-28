import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/backend/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),
]
