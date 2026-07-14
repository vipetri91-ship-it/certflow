import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaLancamento = z.object({
  tipo: z.enum(['RECEBER', 'PAGAR']),
  descricao: z.string().min(2),
  valor: z.number().positive(),
  dataVencimento: z.string(),
  dataPagamento: z.string().optional(),
  status: z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']).optional(),
  categoriaId: z.string().optional(),
  pedidoId: z.string().optional(),
  parceiroId: z.string().optional(),
  comprovante: z.string().optional(),
  notaFiscal: z.string().optional(),
  boleto: z.string().optional(),
  observacoes: z.string().optional(),
  referencia: z.string().optional(),
  tipoConta: z.string().optional(),
  centroCusto: z.string().optional(),
  formaPagamento: z.string().optional(),
  banco: z.string().optional(),
})

const ROLES_CONTAS_PAGAR = ['ADMIN', 'GERENTE']
const ROLES_CONTAS_RECEBER = ['ADMIN', 'GERENTE', 'FINANCEIRO', 'VISUALIZADOR', 'OPERADOR_FINANCEIRO']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo    = searchParams.get('tipo')
  const status  = searchParams.get('status')
  const mes     = searchParams.get('mes')
  const ano     = searchParams.get('ano')
  const page    = Number(searchParams.get('page')  ?? 1)
  const limit   = Number(searchParams.get('limit') ?? 50)

  // Sem tipo definido, a consulta abaixo retornaria RECEBER e PAGAR
  // misturados — por isso é tratado como "pode conter Contas a Pagar" e
  // exige o mesmo nível de acesso que tipo=PAGAR.
  const podeVer = tipo === 'RECEBER'
    ? ROLES_CONTAS_RECEBER.includes(session.user.role)
    : ROLES_CONTAS_PAGAR.includes(session.user.role)
  if (!podeVer) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  let dataFiltro = {}
  if (mes && ano) {
    const inicio = new Date(Number(ano), Number(mes) - 1, 1)
    const fim    = new Date(Number(ano), Number(mes), 0)
    dataFiltro = { dataVencimento: { gte: inicio, lte: fim } }
  }

  const where = {
    ...(tipo   ? { tipo:   tipo   as 'RECEBER' | 'PAGAR' } : {}),
    ...(status ? { status: status as 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO' } : {}),
    ...dataFiltro,
  }

  const [lancamentos, total, totais] = await Promise.all([
    prisma.lancamento.findMany({
      where,
      include: {
        categoria: true,
        pedido:    { select: { numero: true, cliente: { select: { nome: true } } } },
        parceiro:  { select: { id: true, nome: true } },
      },
      orderBy: { dataVencimento: 'asc' },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    prisma.lancamento.count({ where }),
    // Antes ignorava "where" e sempre somava RECEBER + PAGAR juntos — mesmo
    // numa consulta filtrada por tipo=RECEBER, os totais vazavam valores de
    // Contas a Pagar pra quem não deveria ver. Agora respeita o mesmo filtro
    // da consulta principal.
    prisma.lancamento.groupBy({ by: ['tipo', 'status'], where, _sum: { valor: true } }),
  ])

  return NextResponse.json({ lancamentos, total, totais, page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body   = await req.json()
  const parsed = schemaLancamento.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  // Criar Contas a Pagar é exclusivo de ADMIN/GERENTE — sem isso, qualquer
  // usuário autenticado (inclusive OPERADOR_FINANCEIRO) poderia lançar uma
  // conta a pagar direto por aqui, mesmo sem acesso à tela.
  if (parsed.data.tipo === 'PAGAR' && !ROLES_CONTAS_PAGAR.includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão para lançar Contas a Pagar' }, { status: 403 })
  }

  const lancamento = await prisma.lancamento.create({
    data: {
      ...parsed.data,
      dataVencimento: new Date(parsed.data.dataVencimento),
      dataPagamento:  parsed.data.dataPagamento ? new Date(parsed.data.dataPagamento) : null,
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao:      'CREATE',
    entidade:  'Lancamento',
    entidadeId: lancamento.id,
    dados: { tipo: lancamento.tipo, valor: lancamento.valor, descricao: lancamento.descricao },
  })

  return NextResponse.json(lancamento, { status: 201 })
}