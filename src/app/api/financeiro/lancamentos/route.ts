import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaLancamento = z.object({
  tipo: z.enum(['RECEBER', 'PAGAR']),
  descricao: z.string().min(3),
  valor: z.number().positive(),
  dataVencimento: z.string(),
  dataPagamento: z.string().optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']).optional(),
  categoriaId: z.string().optional(),
  pedidoId: z.string().optional(),
  comprovante: z.string().optional(),
  observacoes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const status = searchParams.get('status')
  const mes = searchParams.get('mes')
  const ano = searchParams.get('ano')
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 50)

  let dataFiltro = {}
  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1)
    const fim = new Date(Number(ano), Number(mes), 0)
    dataFiltro = { dataVencimento: { gte: inicio, lte: fim } }
  }

  const where = {
    ...(tipo ? { tipo: tipo as 'RECEBER' | 'PAGAR' } : {}),
    ...(status ? { status: status as 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO' } : {}),
    ...dataFiltro,
  }

  const [lancamentos, total, totais] = await Promise.all([
    prisma.lancamento.findMany({
      where,
      include: { categoria: true, pedido: { select: { numero: true } } },
      orderBy: { dataVencimento: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lancamento.count({ where }),
    prisma.lancamento.groupBy({
      by: ['tipo', 'status'],
      _sum: { valor: true },
    }),
  ])

  return NextResponse.json({ lancamentos, total, totais, page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schemaLancamento.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const lancamento = await prisma.lancamento.create({
    data: {
      ...parsed.data,
      dataVencimento: new Date(parsed.data.dataVencimento),
      dataPagamento: parsed.data.dataPagamento ? new Date(parsed.data.dataPagamento) : null,
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Lancamento',
    entidadeId: lancamento.id,
    dados: { tipo: lancamento.tipo, valor: lancamento.valor, descricao: lancamento.descricao },
  })

  return NextResponse.json(lancamento, { status: 201 })
}