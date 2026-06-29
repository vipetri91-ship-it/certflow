import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  itens: z.array(z.object({
    modeloId: z.string(),
    valorCusto: z.number().nonnegative().nullable(),
  })),
})

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const tabela = await prisma.tabelaPreco.findUnique({ where: { id }, include: { itens: true } })
  if (!tabela) return NextResponse.json({ erro: 'Tabela não encontrada' }, { status: 404 })

  return NextResponse.json({ tabela })
}

// Substitui todos os itens da tabela pelos valores enviados — modelos sem
// valor (null) ficam sem item (gap intencional, ex.: Cartão+Leitora e
// Nuvem nas tabelas 4/5 que não cobrem esses modelos).
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erro: 'Dados inválidos', detalhes: parsed.error.flatten() }, { status: 422 })
  }

  const tabela = await prisma.tabelaPreco.findUnique({ where: { id } })
  if (!tabela) return NextResponse.json({ erro: 'Tabela não encontrada' }, { status: 404 })

  await prisma.$transaction(async (tx) => {
    for (const item of parsed.data.itens) {
      if (item.valorCusto === null) {
        await tx.tabelaPrecoItem.deleteMany({ where: { tabelaPrecoId: id, modeloId: item.modeloId } })
      } else {
        await tx.tabelaPrecoItem.upsert({
          where: { tabelaPrecoId_modeloId: { tabelaPrecoId: id, modeloId: item.modeloId } },
          create: { tabelaPrecoId: id, modeloId: item.modeloId, valorCusto: item.valorCusto },
          update: { valorCusto: item.valorCusto },
        })
      }
    }
  })

  const atualizada = await prisma.tabelaPreco.findUnique({ where: { id }, include: { itens: true } })
  return NextResponse.json({ tabela: atualizada })
}
