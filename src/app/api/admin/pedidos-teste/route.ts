export const preferredRegion = 'gru1'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const HOJE_INICIO = new Date('2026-06-05T03:00:00Z')  // 00:00 BRT
const AMANHA      = new Date('2026-06-06T03:00:00Z')

// GET — lista pedidos de hoje
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const pedidos = await prisma.pedido.findMany({
    where: { createdAt: { gte: HOJE_INICIO, lt: AMANHA } },
    include: {
      cliente: { select: { nome: true } },
      itens:   { include: { modelo: { select: { nome: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(pedidos.map(p => ({
    id:     p.id,
    numero: p.numero,
    status: p.status,
    valor:  Number(p.valorFinal),
    cliente: p.cliente.nome,
    modelo:  p.itens[0]?.modelo?.nome ?? '—',
    hora:    p.createdAt,
  })))
}

// DELETE — exclui pedidos pelo array de IDs recebido no body
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { ids } = await req.json() as { ids: string[] }
  if (!ids?.length) return NextResponse.json({ erro: 'ids obrigatório' }, { status: 400 })

  // Garante que os IDs pertencem a pedidos de hoje (proteção extra)
  const pedidos = await prisma.pedido.findMany({
    where: { id: { in: ids }, createdAt: { gte: HOJE_INICIO, lt: AMANHA } },
    select: { id: true },
  })
  const idsValidos = pedidos.map(p => p.id)
  if (!idsValidos.length) return NextResponse.json({ excluidos: 0 })

  // Deleta na ordem correta para respeitar FKs
  await prisma.itemPedido.deleteMany({ where: { pedidoId: { in: idsValidos } } })
  await prisma.lancamento.deleteMany({ where: { pedidoId: { in: idsValidos } } })

  // Tenta deletar agendamentos se existirem
  try {
    await (prisma as any).agendamento?.deleteMany?.({ where: { pedidoId: { in: idsValidos } } })
  } catch {}

  await prisma.pedido.deleteMany({ where: { id: { in: idsValidos } } })

  return NextResponse.json({ excluidos: idsValidos.length })
}
