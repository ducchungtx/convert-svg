import { DefaultSession } from "next-auth"
import { DefaultUser } from "next-auth"

type UserRole = "USER" | "PREMIUM" | "ADMIN"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession["user"]
    accessToken?: string
    refreshToken?: string
  }

  interface User extends DefaultUser {
    role: UserRole
    accessToken?: string
    refreshToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    accessToken?: string
    refreshToken?: string
  }
}
