/**
 * Better Auth サーバーサイドインスタンス（ADR-008 準拠）
 *
 * Cognito ネイティブプロバイダを使用。
 * 環境変数はすべて .env.local(.example) を参照。
 *
 * ---- ローカル開発の既知制約 (ADR-008 補足) ----
 * Better Auth 1.6.11 の `cognito` プロバイダは authorize / token / userinfo エンドポイントを
 * `https://` でハードコードし、JWKS/issuer を AWS 実ドメイン
 * (`cognito-idp.{region}.amazonaws.com`) に固定している
 * （@better-auth/core/dist/social-providers/cognito.mjs を参照）。
 *
 * cognito-local は http:// かつ Hosted UI（OAuth 認可エンドポイント）を持たないため、
 * `socialProviders.cognito` 経由のブラウザサインインはローカルでは成立しない。
 *
 * ローカルの受入検証（8.1）は `scripts/provision-cognito.sh --jwt <email>` で
 * cognito-local から直接 JWT を取得し、バックエンド API に Bearer として渡す方式で行う。
 * バックエンドは `jwk-set-uri` のみで検証（issuer 不問）するため、
 * cognito-local 発行 JWT をそのまま受理できる（ADR-016 補足参照）。
 *
 * 本番 Cognito（Hosted UI + https://）では通常の OAuth フローが使用される。
 * この実装ロジックは変更しない（本番用のまま維持）。
 */
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    cognito: {
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET ?? "",
      // COGNITO_DOMAIN: Cognito ホスト型 UI のドメイン
      //   本番: "your-app.auth.ap-northeast-1.amazoncognito.com"
      //   ローカル(cognito-local): "localhost:9229" (https:// 固定のため要検討)
      domain: process.env.COGNITO_DOMAIN ?? "localhost:9229",
      region: process.env.COGNITO_REGION ?? "ap-northeast-1",
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
