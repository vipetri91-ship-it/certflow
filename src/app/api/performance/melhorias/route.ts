import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaMelhoria = z.object({
  titulo: z.string().min(3, 'Dê um título curto pra ideia'),
  descricao: z.string().min(5, 'Descreva a ideia'),
  categoria: z.enum(['ECONOMIA', 'AUTOMACAO', 'PROCESSO', 'ATENDIMENTO', 'MARKETING']),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'performance:read')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const melhorias = await prisma.melhoriaContinua.findMany({
    orderBy: { createdAt: 'desc' },
    include: { autor: { select: { nome: true } } },
  })

  return NextResponse.json(melhorias)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!hasPermission(session.user.role, 'melhorias:write')) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schemaMelhoria.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const melhoria = await prisma.melhoriaContinua.create({
    data: { ...parsed.data, autorId: session.user.id },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'MelhoriaContinua',
    entidadeId: melhoria.id,
  })

  return NextResponse.json(melhoria, { status: 201 })
}
