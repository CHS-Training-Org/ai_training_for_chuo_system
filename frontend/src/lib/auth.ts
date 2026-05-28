import { betterAuth } from 'better-auth'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    cognito: {
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: '',
      issuer: process.env.COGNITO_ISSUER!,
    },
  },
})

export type Session = typeof auth.$Infer.Session
