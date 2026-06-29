import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(2),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const tabelas = await prisma.tabelaPreco.findMany({
    include: { itens: true, _count: { select: { parceiros: true } } },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json({ tabelas })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const tabela = await prisma.tabelaPreco.create({ data: { nome: parsed.data.nome } })
  return NextResponse.json({ tabela }, { status: 201 })
}
