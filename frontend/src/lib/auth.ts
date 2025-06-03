import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Define user with tokens interface
interface UserWithTokens {
  id: string
  email: string
  name: string | null
  image: string | null
  role: "USER" | "PREMIUM" | "ADMIN"
  accessToken?: string
  refreshToken?: string
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing email or password credentials');
          return null
        }

        console.log('Attempting to authorize user:', credentials.email);

        try {
          // Use API base URL from environment
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          console.log('Using API URL:', apiUrl);

          const backendResponse = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          console.log('Backend response status:', backendResponse.status);

          if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            console.log('Backend login successful:', {
              success: backendData.success,
              hasUser: !!backendData.data?.user,
              hasToken: !!backendData.data?.token,
              userId: backendData.data?.user?.id
            });

            if (backendData.success && backendData.data) {
              const userData = {
                id: backendData.data.user.id.toString(),
                email: backendData.data.user.email,
                name: backendData.data.user.name,
                image: null,
                role: backendData.data.user.role,
                accessToken: backendData.data.token,
                refreshToken: backendData.data.refreshToken,
              };

              console.log('Returning user data with tokens:', {
                id: userData.id,
                email: userData.email,
                hasAccessToken: !!userData.accessToken,
                tokenPreview: userData.accessToken?.substring(0, 20) + '...'
              });

              return userData;
            }
          } else {
            const errorData = await backendResponse.text();
            console.log('Backend login failed:', backendResponse.status, errorData);
          }

          // Fallback to database check if backend API fails
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email as string
            }
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          }
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('JWT callback called:', {
        hasUser: !!user,
        hasAccount: !!account,
        provider: account?.provider,
        tokenSub: token.sub,
        userWithTokens: user ? {
          id: user.id,
          hasAccessToken: !!(user as UserWithTokens).accessToken,
          accessTokenPreview: (user as UserWithTokens).accessToken ?
            (user as UserWithTokens).accessToken!.substring(0, 20) + '...' : 'none'
        } : null
      });

      if (user && account?.provider === "credentials") {
        // Store backend tokens in JWT token
        const userWithTokens = user as UserWithTokens
        token.accessToken = userWithTokens.accessToken
        token.refreshToken = userWithTokens.refreshToken
        token.role = userWithTokens.role || "USER"

        console.log('Storing tokens in JWT:', {
          hasAccessToken: !!token.accessToken,
          hasRefreshToken: !!token.refreshToken,
          role: token.role,
          accessTokenPreview: typeof token.accessToken === 'string' ? token.accessToken.substring(0, 20) + '...' : 'none'
        });
      }
      return token
    },
    async session({ session, token }) {
      console.log('Session callback called:', {
        hasToken: !!token,
        tokenSub: token.sub,
        tokenHasAccessToken: !!token.accessToken,
        tokenRole: token.role
      });

      if (token && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as "USER" | "PREMIUM" | "ADMIN"
        // Add tokens to session for API calls
        if (token.accessToken) {
          session.accessToken = token.accessToken as string
          console.log('Added accessToken to session:', {
            hasAccessToken: !!session.accessToken,
            accessTokenPreview: (session.accessToken as string).substring(0, 20) + '...'
          });
        }
        if (token.refreshToken) {
          session.refreshToken = token.refreshToken as string
        }
      }

      console.log('Final session:', {
        hasUser: !!session.user,
        userId: session.user?.id,
        userRole: session.user?.role,
        hasAccessToken: !!session.accessToken,
        hasRefreshToken: !!session.refreshToken
      });

      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
