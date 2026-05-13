import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { z } from 'zod'

const schemaItem = z.object({
  modeloId: z.string(),
  quantidade: z.number().int().positive(),
  precoUnit: z.number().nonnegative(),
  desconto: z.number().nonnegative().default(0),
})

const schemaPedido = z.object({
  clienteId: z.string(),
  parceiroId: z.string().optional(),
  formaPagamento: z.string().optional(),
  desconto: z.number().nonnegative().default(0),
  observacoes: z.string().optional(),
  itens: z.array(schemaItem).min(1),
})

function gerarNumero(): string {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `PED-${ano}${mes}-${rand}`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)
  const status = searchParams.get('status')
  const clienteId = searchParams.get('clienteId')

  const where = {
    ...(status ? { status: status as any } : {}),
    ...(clienteId ? { clienteId } : {}),
  }

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where,
      include: {
        cliente: { select: { nome: true } },
        usuario: { select: { nome: true } },
        itens: { include: { modelo: { select: { nome: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pedido.count({ where }),
  ])

  return NextResponse.json({ pedidos, total, page })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = schemaPedido.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const { itens, desconto, ...dadosPedido } = parsed.data

  const valorTotal = itens.reduce((acc, i) => acc + (i.quantidade * i.precoUnit), 0)
  const valorFinal = valorTotal - desconto - itens.reduce((acc, i) => acc + i.desconto, 0)

  const pedido = await prisma.pedido.create({
    data: {
      ...dadosPedido,
      numero: gerarNumero(),
      usuarioId: session.user.id,
      valorTotal,
      desconto,
      valorFinal,
      status: 'PENDENTE',
      itens: {
        create: itens.map(i => ({
          modeloId: i.modeloId,
          quantidade: i.quantidade,
          precoUnit: i.precoUnit,
          desconto: i.desconto,
          subtotal: (i.quantidade * i.precoUnit) - i.desconto,
        })),
      },
    },
    include: { itens: true, cliente: { select: { nome: true } } },
  })

  // Criar lançamento financeiro automaticamente
  await prisma.lancamento.create({
    data: {
      tipo: 'RECEBER',
      descricao: `Pedido ${pedido.numero} — ${pedido.cliente.nome}`,
      valor: valorFinal,
      dataVencimento: new Date(),
      status: 'PENDENTE',
      pedidoId: pedido.id,
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Pedido',
    entidadeId: pedido.id,
    dados: { numero: pedido.numero, valorFinal, cliente: pedido.cliente.nome },
  })

  return NextResponse.json(pedido, { status: 201 })
}