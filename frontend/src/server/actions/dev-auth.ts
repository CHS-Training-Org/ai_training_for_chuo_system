"use server";

/**
 * ローカル開発専用ロール別ログイン（ADR-008 補足）
 *
 * Better Auth 1.6.11 の cognito プロバイダは authorize/token を https:// + AWS 実ドメイン
 * 固定で組み立てるため、cognito-local（http://・Hosted UI なし）ではブラウザ OAuth サインイン
 * が成立しない（auth.ts 冒頭のコメント参照）。
 *
 * そこで開発時のみ、シードユーザー（scripts/provision-cognito.sh が作成）で
 * cognito-local に対し直接 InitiateAuth（USER_PASSWORD_AUTH）を行い、取得した IdToken を
 * dev 専用 cookie に保存する。BE は jwk-set-uri で署名検証し、IdToken の custom:role / sub
 * から認可・ユーザー解決を行うため、Better Auth の本番 OAuth と同じ経路で API 通信が成立する。
 *
 * NODE_ENV !== 'production' でのみ動作する。本番ではこの Server Action は必ず例外を投げる
 * （UI からボタンを描画していなくても action ID で直接 POST され得るため、ここでの遮断が
 * 唯一かつ最終的な防衛線になる。session.ts 側のガードと合わせて多層防御を構成する）。
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RoleSchema, type Role } from "@/lib/types";
import { DEV_ID_TOKEN_COOKIE } from "@/lib/session";

const DEV_USER_PASSWORD = "BookFlow1234!";

const ROLE_TO_EMAIL: Record<Role, string> = {
  MEMBER: "hanako.tanaka@example.com",
  APPROVER: "ichiro.suzuki@example.com",
  ADMIN: "taro.kanri@example.com",
};

async function resolveCognitoLocalEndpoint(): Promise<string> {
  return process.env.COGNITO_LOCAL_ENDPOINT ?? "http://cognito-local:9229";
}

async function fetchIdToken(email: string): Promise<string> {
  const endpoint = await resolveCognitoLocalEndpoint();
  const clientId = process.env.COGNITO_CLIENT_ID;

  const res = await fetch(`${endpoint}/`, {
    method: "POST",
    headers: {
      "X-Amz-Target": "AmazonCognitoIdentityProviderService.InitiateAuth",
      "Content-Type": "application/x-amz-json-1.1",
    },
    body: JSON.stringify({
      ClientId: clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: DEV_USER_PASSWORD,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`cognito-local InitiateAuth failed: HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  const idToken = (json as { AuthenticationResult?: { IdToken?: string } })?.AuthenticationResult
    ?.IdToken;

  if (!idToken) {
    throw new Error("cognito-local InitiateAuth did not return an IdToken");
  }

  return idToken;
}

/**
 * ロールを指定してシードユーザーとしてログインする（開発専用）。
 * フォームの hidden input `role` から呼び出される想定。
 */
export async function devLoginAction(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("devLoginAction is not available in production");
  }

  const role = RoleSchema.parse(formData.get("role"));
  const email = ROLE_TO_EMAIL[role];

  const idToken = await fetchIdToken(email);

  const cookieStore = await cookies();
  cookieStore.set(DEV_ID_TOKEN_COOKIE, idToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    maxAge: 60 * 60,
  });

  redirect("/");
}
