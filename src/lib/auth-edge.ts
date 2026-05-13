import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { Role } from '../generated/prisma/client'

// Configuração leve sem Prisma — usada apenas no middleware (Edge Runtime)
export const { auth: authEdge } = NextAuth({
  providers: [
    CredentialsProvider({
      credentials: { email: {}, password: {} },
      async authorize() {
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
})