import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
