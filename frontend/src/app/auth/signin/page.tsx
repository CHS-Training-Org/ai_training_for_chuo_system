"use client";

import { signIn } from "@/lib/auth-client";
import { devLoginAction } from "@/server/actions/dev-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/labels";

/** 開発用ログインボタンのラベル（「表示名（ENUM）」形式、screen-spec.md L115 準拠） */
const DEV_ROLE_LABELS: Record<Role, string> = {
  MEMBER: `${ROLE_LABELS.MEMBER}（MEMBER）`,
  APPROVER: `${ROLE_LABELS.APPROVER}（APPROVER）`,
  ADMIN: `${ROLE_LABELS.ADMIN}（ADMIN）`,
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">BookFlow</CardTitle>
          <CardDescription>施設・備品予約システム</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={() => signIn.social({ provider: "cognito", callbackURL: "/" })}
          >
            サインイン
          </Button>

          {process.env.NODE_ENV !== "production" && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-center text-xs text-muted-foreground">
                開発用：ロールを選択してログイン（cognito-local シードユーザー）
              </p>
              {(Object.keys(DEV_ROLE_LABELS) as Role[]).map((role) => (
                <form key={role} action={devLoginAction}>
                  <input type="hidden" name="role" value={role} />
                  <Button type="submit" variant="outline" className="w-full">
                    {DEV_ROLE_LABELS[role]}でログイン
                  </Button>
                </form>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
