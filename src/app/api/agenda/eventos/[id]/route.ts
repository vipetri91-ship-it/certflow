import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { atualizarEvento, deletarEvento } from '@/lib/google/calendar'
import { z } from 'zod'

const schemaUpdate = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  localizacao: z.string().optional(),
  agr: z.enum(['vinicius', 'ana', 'arlen']).optional(),
  tipo: z.enum(['presencial', 'videoconferencia', 'bonificado', 'pessoal', 'pre-agendado']).optional(),
  inicio: z.string().optional(),
  fim: z.string().optional(),
  calendarId: z.string().optional(),
})

async function getTokens() {
  const [at, rt] = await Promise.all([
    prisma.configuracao.findUnique({ where: { chave: 'google_access_token' } }),
    prisma.configuracao.findUnique({ where: { chave: 'google_refresh_token' } }),
  ])
  return { accessToken: at?.valor ?? '', refreshToken: rt?.valor ?? '' }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schemaUpdate.safeParse(body)
  if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })

  const { calendarId, ...updates } = parsed.data
  const { accessToken, refreshToken } = await getTokens()

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ erro: 'Google não autenticado' }, { status: 400 })
  }

  try {
    const evento = await atualizarEvento(accessToken, refreshToken, id, updates, calendarId ?? 'primary')
    return NextResponse.json({ ok: true, evento })
  } catch (err) {
    console.error('Erro ao atualizar evento:', err)
    return NextResponse.json({ erro: 'Erro ao atualizar evento' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const { searchParams } = new URL(req.url)
  const calendarId = searchParams.get('calendarId') ?? 'primary'

  const { accessToken, refreshToken } = await getTokens()
  if (!accessToken || !refreshToken) {
    return NextResponse.json({ erro: 'Google não autenticado' }, { status: 400 })
  }

  try {
    await deletarEvento(accessToken, refreshToken, id, calendarId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erro ao deletar evento:', err)
    return NextResponse.json({ erro: 'Erro ao deletar evento' }, { status: 500 })
  }
}
