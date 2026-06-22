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
  const q = searchParams.get('q')?.trim()

  const where = {
    ...(status ? { status: status as any } : {}),
    ...(clienteId ? { clienteId } : {}),
    ...(q ? {
      OR: [
        { numero: { contains: q, mode: 'insensitive' as const } },
        { cliente: { nome: { contains: q, mode: 'insensitive' as const } } },
      ],
    } : {}),
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
      status: 'GERADO' as any,
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
    include: { itens: true },
  })

  // Buscar nome do cliente para a auditoria
  const cliente = await prisma.cliente.findUnique({ where: { id: parsed.data.clienteId }, select: { nome: true } })

  // Lançamento financeiro: não é mais criado aqui — passa a ser criado
  // quando o pedido for marcado como EMITIDO (ver
  // PATCH /api/pedidos/[id], docs/ESPECIFICACAO_LANCAMENTO_NA_EMISSAO.md)

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'Pedido',
    entidadeId: pedido.id,
    dados: { numero: pedido.numero, valorFinal, cliente: cliente?.nome },
  })

  return NextResponse.json(pedido, { status: 201 })
}