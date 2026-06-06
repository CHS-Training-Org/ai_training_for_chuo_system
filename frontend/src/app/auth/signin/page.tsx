'use client'

import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">BookFlow</CardTitle>
          <CardDescription>施設・備品予約システム</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() =>
              signIn.social({ provider: 'cognito', callbackURL: '/' })
            }
          >
            サインイン
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
