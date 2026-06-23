import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularComissaoParceiro } from '@/lib/comissoes'
import { registrarAuditoria } from '@/lib/audit'

const CATEGORIA_COMISSAO_ID = 'cat02' // "Comissões Parceiros" (DESPESA)

export async function POST(req: NextRequest, ctx: { params: Promise<{ parceiroId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { parceiroId } = await ctx.params
  const { mes, ano } = await req.json()
  if (!mes || !ano) return NextResponse.json({ erro: 'mes e ano são obrigatórios' }, { status: 422 })

  const existente = await prisma.comissaoFechamento.findUnique({
    where: { parceiroId_mes_ano: { parceiroId, mes, ano } },
  })
  if (existente?.status === 'PAGO') {
    return NextResponse.json({ erro: 'Comissão deste período já foi marcada como paga' }, { status: 422 })
  }

  const resumo = await calcularComissaoParceiro(parceiroId, mes, ano)
  if (!resumo || resumo.valorTotal <= 0) {
    return NextResponse.json({ erro: 'Nenhuma comissão a pagar neste período' }, { status: 422 })
  }

  const parceiro = await prisma.parceiro.findUnique({ where: { id: parceiroId }, select: { nome: true, diaPagamento: true } })
  if (!parceiro) return NextResponse.json({ erro: 'Parceiro não encontrado' }, { status: 404 })

  const dia = parceiro.diaPagamento && parceiro.diaPagamento >= 1 && parceiro.diaPagamento <= 28 ? parceiro.diaPagamento : 5
  const vencimento = new Date(ano, mes, dia) // mês seguinte ao período de referência

  const lancamento = await prisma.lancamento.create({
    data: {
      tipo:           'PAGAR',
      descricao:      `Comissão — ${parceiro.nome} (${String(mes).padStart(2, '0')}/${ano})`,
      valor:          resumo.valorTotal,
      dataVencimento: vencimento,
      status:         'PENDENTE',
      categoriaId:    CATEGORIA_COMISSAO_ID,
      parceiroId,
      tipoConta:      'Comissão',
      referencia:     `${String(mes).padStart(2, '0')}/${ano}`,
    },
  })

  const fechamento = await prisma.comissaoFechamento.upsert({
    where: { parceiroId_mes_ano: { parceiroId, mes, ano } },
    create: {
      parceiroId, mes, ano,
      valorTotal: resumo.valorTotal,
      qtdPedidos: resumo.qtdPedidos,
      status: 'PAGO',
      lancamentoId: lancamento.id,
      pagoEm: new Date(),
    },
    update: {
      valorTotal: resumo.valorTotal,
      qtdPedidos: resumo.qtdPedidos,
      status: 'PAGO',
      lancamentoId: lancamento.id,
      pagoEm: new Date(),
    },
  })

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'ComissaoFechamento',
    entidadeId: fechamento.id,
    dados: { parceiroId, mes, ano, valorTotal: resumo.valorTotal, qtdPedidos: resumo.qtdPedidos, lancamentoId: lancamento.id },
  })

  return NextResponse.json({ fechamento, lancamento })
}
