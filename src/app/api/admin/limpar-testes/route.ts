import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const HOJE_INICIO = new Date('2026-06-09T03:00:00Z')
const HOJE_FIM    = new Date('2026-06-10T03:00:00Z')
const filtro      = { createdAt: { gte: HOJE_INICIO, lt: HOJE_FIM } }

// GET — apenas lista o que seria excluído, sem deletar nada
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Apenas administradores' }, { status: 403 })
  }

  const [pedidos, lancamentos] = await Promise.all([
    prisma.pedido.findMany({
      where: filtro,
      select: {
        id: true, numero: true, status: true, agr: true, createdAt: true,
        cliente:  { select: { nome: true } },
        usuario:  { select: { nome: true } },
        _count:   { select: { itens: true, certificados: true, lancamentos: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.lancamento.findMany({
      where: filtro,
      select: {
        id: true, tipo: true, valor: true, descricao: true, status: true, createdAt: true,
        pedido: { select: { numero: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return NextResponse.json({
    aviso: 'Apenas listagem — nenhum dado foi excluído. Use DELETE para excluir.',
    pedidos,
    lancamentos,
    resumo: {
      pedidos:      pedidos.length,
      lancamentos:  lancamentos.length,
      itens:        pedidos.reduce((a, p) => a + p._count.itens, 0),
      certificados: pedidos.reduce((a, p) => a + p._count.certificados, 0),
    },
  })
}

// DELETE — exclui todos os pedidos e lançamentos de hoje
export async function DELETE() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ erro: 'Apenas administradores' }, { status: 403 })
  }

  const pedidos = await prisma.pedido.findMany({
    where: filtro,
    select: { id: true, numero: true },
  })
  const pedidoIds = pedidos.map(p => p.id)

  // Exclui na ordem correta para respeitar as foreign keys
  const [itens, certs, lancamentos] = await Promise.all([
    prisma.itemPedido.deleteMany({ where: { pedidoId: { in: pedidoIds } } }),
    prisma.certificado.deleteMany({ where: { pedidoId: { in: pedidoIds } } }),
    prisma.lancamento.deleteMany({ where: filtro }),
  ])

  const pedidosExcluidos = await prisma.pedido.deleteMany({
    where: { id: { in: pedidoIds } },
  })

  return NextResponse.json({
    ok: true,
    excluidos: {
      pedidos:     pedidosExcluidos.count,
      itens:       itens.count,
      certificados: certs.count,
      lancamentos: lancamentos.count,
    },
    numeros: pedidos.map(p => p.numero),
  })
}
