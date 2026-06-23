import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularComissoesPeriodo } from '@/lib/comissoes'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const hoje = new Date()
  const mes = Number(searchParams.get('mes') ?? hoje.getMonth() + 1)
  const ano = Number(searchParams.get('ano') ?? hoje.getFullYear())

  const resumos = await calcularComissoesPeriodo(mes, ano)

  const fechamentos = await prisma.comissaoFechamento.findMany({
    where: { mes, ano, parceiroId: { in: resumos.map(r => r.parceiroId) } },
  })
  const fechamentoPorParceiro = new Map(fechamentos.map(f => [f.parceiroId, f]))

  const dados = resumos.map(r => ({
    ...r,
    status: fechamentoPorParceiro.get(r.parceiroId)?.status ?? 'PENDENTE',
    pagoEm: fechamentoPorParceiro.get(r.parceiroId)?.pagoEm ?? null,
  }))

  return NextResponse.json({ mes, ano, parceiros: dados })
}
