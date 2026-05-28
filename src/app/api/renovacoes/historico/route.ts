import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('clienteId')
  if (!clienteId) return NextResponse.json({ erro: 'clienteId obrigatório' }, { status: 400 })

  const historico = await prisma.historicoContato.findMany({
    where: { clienteId },
    include: { usuario: { select: { nome: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(historico)
}

const schema = z.object({
  clienteId: z.string(),
  certificadoId: z.string().optional(),
  observacao: z.string().min(1),
  proximoContato: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ erro: 'Dados inválidos' }, { status: 422 })

  const contato = await prisma.historicoContato.create({
    data: {
      clienteId: parsed.data.clienteId,
      certificadoId: parsed.data.certificadoId || undefined,
      observacao: parsed.data.observacao,
      proximoContato: parsed.data.proximoContato ? new Date(parsed.data.proximoContato) : undefined,
      usuarioId: session.user.id,
    },
    include: { usuario: { select: { nome: true } } },
  })

  return NextResponse.json(contato, { status: 201 })
}