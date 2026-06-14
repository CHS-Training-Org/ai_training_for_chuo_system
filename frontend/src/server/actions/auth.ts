"use server";

import { redirect } from "next/navigation";
import { createApiClient } from "@/lib/api-client";
import { UserResponseSchema } from "@/lib/types/api";
import { auth } from "@/lib/auth";
import { DEV_ID_TOKEN_COOKIE, getAccessToken } from "@/lib/session";
import { cookies, headers } from "next/headers";

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  (await cookies()).delete(DEV_ID_TOKEN_COOKIE);
  redirect("/auth/signin");
}

export async function getProfileAction() {
  const client = createApiClient(getAccessToken);
  return client.get("/users/me", UserResponseSchema);
}
