import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaFoco = z.object({
  objetivo: z.string().min(3, 'Descreva o objetivo do dia'),
  responsavelId: z.string().optional(),
  prazo: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const focos = await prisma.focoDoDia.findMany({
    orderBy: { data: 'desc' },
    take: 15,
    include: { responsavel: { select: { nome: true } } },
  })

  return NextResponse.json(focos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schemaFoco.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { objetivo, responsavelId, prazo } = parsed.data

  const foco = await prisma.focoDoDia.create({
    data: {
      objetivo,
      responsavelId: responsavelId || undefined,
      prazo: prazo ? new Date(prazo) : undefined,
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'FocoDoDia',
    entidadeId: foco.id,
  })

  return NextResponse.json(foco, { status: 201 })
}
