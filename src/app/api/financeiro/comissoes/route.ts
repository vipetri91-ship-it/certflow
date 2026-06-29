import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { obterComissoesParceiro } from '@/lib/comissoes'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parceiroId = searchParams.get('parceiroId')

  if (parceiroId) {
    const resumo = await obterComissoesParceiro(parceiroId)
    if (!resumo) return NextResponse.json({ erro: 'Parceiro não encontrado' }, { status: 404 })
    return NextResponse.json(resumo)
  }

  const parceiros = await prisma.parceiro.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })
  return NextResponse.json({ parceiros })
}
