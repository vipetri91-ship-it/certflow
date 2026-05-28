import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const categorias = await prisma.categoriaFinanceira.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, tipo: true, cor: true },
  })

  return NextResponse.json({ categorias })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { nome, tipo, cor } = await req.json()

  if (!nome?.trim() || !tipo) {
    return NextResponse.json({ erro: 'Nome e tipo são obrigatórios' }, { status: 422 })
  }

  const categoria = await prisma.categoriaFinanceira.create({
    data: {
      nome: nome.trim(),
      tipo: tipo as 'RECEITA' | 'DESPESA',
      cor: cor || '#6b7280',
      ativo: true,
    },
  })

  return NextResponse.json(categoria, { status: 201 })
}
