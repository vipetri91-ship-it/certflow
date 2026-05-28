import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const historico = await prisma.sSTHistorico.findMany({
    where: { leadId: id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(historico)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  if (!body.texto?.trim()) return NextResponse.json({ erro: 'Texto obrigatório' }, { status: 400 })

  const entrada = await prisma.sSTHistorico.create({
    data: {
      leadId:    id,
      texto:     body.texto.trim(),
      autorNome: session.user?.name ?? null,
    },
  })
  return NextResponse.json(entrada, { status: 201 })
}
