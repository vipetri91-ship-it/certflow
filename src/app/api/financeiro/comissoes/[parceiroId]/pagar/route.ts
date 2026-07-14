import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pagarComissoesPedido } from '@/lib/comissoes'
import { registrarAuditoria } from '@/lib/audit'

export async function POST(req: NextRequest, ctx: { params: Promise<{ parceiroId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  // Esta rota cria um Lancamento tipo PAGAR (ver src/lib/comissoes.ts) —
  // mesma regra da tela /financeiro/comissoes (ADMIN/GERENTE).
  if (!['ADMIN', 'GERENTE'].includes(session.user.role)) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }

  const { parceiroId } = await ctx.params
  const { comissaoPedidoIds, dataPagamento } = await req.json()

  if (!Array.isArray(comissaoPedidoIds) || comissaoPedidoIds.length === 0) {
    return NextResponse.json({ erro: 'Selecione ao menos um cliente para pagar.' }, { status: 422 })
  }
  if (!dataPagamento) {
    return NextResponse.json({ erro: 'Informe a data do pagamento.' }, { status: 422 })
  }

  const resultado = await pagarComissoesPedido(comissaoPedidoIds, new Date(dataPagamento))
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro }, { status: 422 })
  }

  await registrarAuditoria({
    usuarioId: session.user.id,
    acao: 'CREATE',
    entidade: 'ComissaoPedido',
    entidadeId: parceiroId,
    dados: { parceiroId, comissaoPedidoIds, dataPagamento, valorTotal: resultado.valorTotal },
  })

  return NextResponse.json({ ok: true, valorTotal: resultado.valorTotal })
}
