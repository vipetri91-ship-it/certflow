import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { trocarCodigoPorTokens } from '@/lib/google/calendar'
import { prisma } from '@/lib/prisma'

function baseUrl() {
  return (process.env.NEXTAUTH_URL ?? '').trim().replace(/\/$/, '')
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.redirect(new URL('/login', baseUrl()))

  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/configuracoes?erro=google', baseUrl()))

  try {
    const tokens = await trocarCodigoPorTokens(code)

    // Salvar tokens nas configurações do sistema
    await prisma.configuracao.upsert({
      where: { chave: 'google_access_token' },
      update: { valor: tokens.access_token ?? '' },
      create: { chave: 'google_access_token', valor: tokens.access_token ?? '' },
    })

    if (tokens.refresh_token) {
      await prisma.configuracao.upsert({
        where: { chave: 'google_refresh_token' },
        update: { valor: tokens.refresh_token },
        create: { chave: 'google_refresh_token', valor: tokens.refresh_token },
      })
    }

    return NextResponse.redirect(new URL('/configuracoes?google=conectado', baseUrl()))
  } catch {
    return NextResponse.redirect(new URL('/configuracoes?erro=google', baseUrl()))
  }
}