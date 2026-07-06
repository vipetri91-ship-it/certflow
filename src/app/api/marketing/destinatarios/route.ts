import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDays } from 'date-fns'

export type FiltroMarketing =
  | 'todos_clientes_ativos'
  | 'vencendo_30'
  | 'vencendo_60'
  | 'vencendo_90'
  | 'todos_clientes'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const filtro = (req.nextUrl.searchParams.get('filtro') ?? 'todos_clientes_ativos') as FiltroMarketing
  const hoje = new Date()

  let clientes: { id: string; nome: string; email: string }[] = []

  if (filtro === 'todos_clientes') {
    const rows = await prisma.cliente.findMany({
      where: { email: { not: null } },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    })
    clientes = rows.map(c => ({ id: c.id, nome: c.nome, email: c.email! }))
  } else if (filtro === 'todos_clientes_ativos') {
    const rows = await prisma.cliente.findMany({
      where: {
        email: { not: null },
        certificados: { some: { status: 'ATIVO' } },
      },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    })
    clientes = rows.map(c => ({ id: c.id, nome: c.nome, email: c.email! }))
  } else {
    const dias = filtro === 'vencendo_30' ? 30 : filtro === 'vencendo_60' ? 60 : 90
    const limite = addDays(hoje, dias)
    const rows = await prisma.cliente.findMany({
      where: {
        email: { not: null },
        certificados: {
          some: { status: 'ATIVO', dataVencimento: { gte: hoje, lte: limite } },
        },
      },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    })
    clientes = rows.map(c => ({ id: c.id, nome: c.nome, email: c.email! }))
  }

  return NextResponse.json({
    total: clientes.length,
    preview: clientes.slice(0, 10).map(c => c.nome),
  })
}
