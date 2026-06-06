/**
 * Better Auth Route Handler
 * `/api/auth/*` のすべてのリクエストを Better Auth に委譲する。
 * ADR-008 準拠。
 */
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
