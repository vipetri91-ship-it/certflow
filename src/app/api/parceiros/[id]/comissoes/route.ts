import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const comissoes = await prisma.comissao.findMany({
    where: { parceiroId: id },
    include: { modelo: { select: { id: true, nome: true, preco: true } } },
  })
  return NextResponse.json(comissoes)
}

// PUT — upsert em lote de todas as comissões do parceiro
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body: {
    modeloId: string
    percentual?: number | null
    valorFixo?: number | null
    valorCusto?: number | null
    valorCliente?: number | null
  }[] = await req.json()

  if (!Array.isArray(body)) {
    return NextResponse.json({ erro: 'Payload inválido' }, { status: 400 })
  }

  // Parceiro existe?
  const parceiro = await prisma.parceiro.findUnique({ where: { id }, select: { id: true } })
  if (!parceiro) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 })

  // Upsert para cada item enviado
  await Promise.all(
    body.map(item =>
      prisma.comissao.upsert({
        where: { parceiroId_modeloId: { parceiroId: id, modeloId: item.modeloId } },
        create: {
          parceiroId:   id,
          modeloId:     item.modeloId,
          percentual:   item.percentual   ?? null,
          valorFixo:    item.valorFixo    ?? null,
          valorCusto:   item.valorCusto   ?? null,
          valorCliente: item.valorCliente ?? null,
        },
        update: {
          percentual:   item.percentual   ?? null,
          valorFixo:    item.valorFixo    ?? null,
          valorCusto:   item.valorCusto   ?? null,
          valorCliente: item.valorCliente ?? null,
        },
      })
    )
  )

  const atualizadas = await prisma.comissao.findMany({
    where: { parceiroId: id },
    include: { modelo: { select: { id: true, nome: true, preco: true } } },
  })
  return NextResponse.json(atualizadas)
}
