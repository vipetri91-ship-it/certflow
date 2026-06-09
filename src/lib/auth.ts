import NextAuth, { type DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { verificarRateLimit, registrarFalha, registrarSucesso } from './rate-limit'
import type { Role } from '../generated/prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    role: Role
  }
  interface Session {
    user: {
      id: string
      role: Role
    } & DefaultSession['user']
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Usuário', type: 'text' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) return null

        // Rate limiting por IP (anti brute-force)
        const ip = (request as Request & { headers?: { get?: (k: string) => string | null } })
          ?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

        const { bloqueado } = verificarRateLimit(ip)
        if (bloqueado) {
          throw new Error('Muitas tentativas. Tente novamente em 30 minutos.')
        }

        const usuario = await prisma.usuario.findUnique({
          where: { username: credentials.username as string },
        })

        if (!usuario || !usuario.ativo) {
          registrarFalha(ip)
          return null
        }

        const senhaValida = await bcrypt.compare(
          credentials.password as string,
          usuario.senha
        )

        if (!senhaValida) {
          registrarFalha(ip)
          return null
        }

        registrarSucesso(ip)
        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          role: usuario.role,
        }
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
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})