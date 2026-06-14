/**
 * Better Auth クライアントサイドインスタンス（ADR-008 準拠）
 *
 * クライアントコンポーネントからサインイン・サインアウト・セッション取得に使用する。
 * Server Actions / Server Components では session.ts を使うこと。
 */
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signOut, useSession } = authClient;
